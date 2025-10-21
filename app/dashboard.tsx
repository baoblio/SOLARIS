// app/dashboard.tsx - COMPLETE FIXED VERSION
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    StatusBar,
    RefreshControl,
    Alert,
    AppState,
    AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet from '@gorhom/bottom-sheet';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

// Import components
import Header from '../components/Header';
import ModeSelector from '../components/ModeSelector';
import StatusCard from '../components/StatusCard';
import ManualControls from '../components/ManualControls';
import ScheduleControls from '../components/ScheduleControls';
import RecentCaptures from '../components/RecentCaptures';

// Import lib
import { supabase } from '@/lib/supabase';
import { checkPiConnection, getVideoStreamUrl } from '@/lib/piServer';
import { SystemStatus, Capture, OperationMode, StatusRow } from '@/lib/types';

// ═══════════════════════════════════════════════════
// HELPER FUNCTION (Outside component)
// ═══════════════════════════════════════════════════
const formatLastActivation = (timestamp: string): string => {
    if (!timestamp) return 'Never';
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
};

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════
export default function DashboardScreen() {
    // ─────────────────────────────────────────────────
    // STATE
    // ─────────────────────────────────────────────────
    const [mode, setMode] = useState<OperationMode>('automatic');
    const [systemStatus, setSystemStatus] = useState<SystemStatus>({
        connected: false,
        foyerLight: false,
        porchLight: false,
        lastActivated: 'Never',
        battery: 0,
    });
    const [captures, setCaptures] = useState<Capture[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [piConnected, setPiConnected] = useState(false);
    const [isActive, setIsActive] = useState(true);
    const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: number }>({});
    const bottomSheetRef = useRef<BottomSheet>(null);

    // ─────────────────────────────────────────────────
    // EFFECTS
    // ─────────────────────────────────────────────────
    useEffect(() => {
        loadDashboardData();

        const statusInterval = setInterval(() => {
            if (isActive) {
                loadSystemStatus();
            }
        }, 3000);

        const captureInterval = setInterval(() => {
            if (isActive) {
                loadCaptures();
                checkPi();
            }
        }, 30000);

        const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
            setIsActive(state === 'active');
            if (state === 'active') {
                loadDashboardData();
            }
        });

        return () => {
            clearInterval(statusInterval);
            clearInterval(captureInterval);
            subscription.remove();
        };
    }, [isActive]);

    // ─────────────────────────────────────────────────
    // DATA LOADING FUNCTIONS
    // ─────────────────────────────────────────────────
    const loadDashboardData = async () => {
        try {
            setLoading(true);
            await Promise.all([
                loadSystemStatus(),
                loadCaptures(),
                checkPi(),
            ]);
        } catch (error) {
            console.error('Error loading dashboard:', error);
            Alert.alert('Error', 'Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const checkPi = async () => {
        const isConnected = await checkPiConnection();
        setPiConnected(isConnected);
    };

    const loadSystemStatus = async () => {
        console.log('🔍 ========== LOADING SYSTEM STATUS ==========');

        try {
            // Test 1: Check if Supabase client is initialized
            console.log('📡 Has auth?', !!supabase.auth);

            // Test 2: Try a simple count first
            const { count, error: countError } = await supabase
                .from('status')
                .select('*', { count: 'exact', head: true });

            console.log('📊 Total rows in status table:', count);
            console.log('📊 Count error:', countError);

            // Test 3: Try getting data WITHOUT .single()
            const { data: allData, error: allError } = await supabase
                .from('status')
                .select('*')
                .order('created_at', { ascending: false });

            console.log('📊 All data query:');
            console.log('   - Rows returned:', allData?.length || 0);
            console.log('   - Data:', JSON.stringify(allData, null, 2));
            console.log('   - Error:', allError);

            // Test 4: Original query with .single()
            const { data, error } = await supabase
                .from('status')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            console.log('📊 Single query:');
            console.log('   - Data:', JSON.stringify(data, null, 2));
            console.log('   - Error:', error);
            console.log('   - Error code:', error?.code);

            // Handle PGRST116 (0 rows)
            if (error && error.code === 'PGRST116') {
                console.warn('⚠️ No status row found in the database. Using default state.');
                setSystemStatus({
                    connected: false,
                    foyerLight: false,
                    porchLight: false,
                    lastActivated: 'Never',
                    battery: 0,
                });
                setMode('automatic');
                return;
            }

            // Handle other errors
            if (error) {
                console.error('❌ Supabase error:', error);
                throw error;
            }

            // If data exists, update the state
            if (data) {
                console.log('✅ Successfully loaded status data!');
                setSystemStatus({
                    connected: data.connection,
                    foyerLight: data.foyer,
                    porchLight: data.porch,
                    lastActivated: formatLastActivation(data.last_activation),
                    battery: data.battery_percentage || 0,
                });
                setMode(data.mode_of_operation as OperationMode);
            }

            console.log('🔍 ========== END LOADING STATUS ==========');
        } catch (error) {
            console.error('💥 Exception in loadSystemStatus:', error);
            Alert.alert("Connection Error", "Could not load system status from the server.");
        }
    };

    const loadCaptures = async () => {
        try {
            const { data, error } = await supabase
                .from('motion_events')
                .select('*')
                .order('detected_at', { ascending: false })
                .limit(10);

            if (error) throw error;

            if (data) {
                setCaptures(
                    data.map((event) => ({
                        id: event.id,
                        file_name: event.file_name,
                        file_path: event.file_path,
                        file_size: event.file_size || 0,
                        duration: event.duration || 0,
                        detected_at: event.detected_at,
                        timestamp: new Date(event.detected_at).toLocaleString(),
                        location: event.location,
                        thumbnail_data: event.thumbnail_data,
                        viewed: event.viewed || false,
                        starred: event.starred || false,
                    }))
                );
            }
        } catch (error) {
            console.error('Error loading captures:', error);
        }
    };

    // ─────────────────────────────────────────────────
    // EVENT HANDLERS
    // ─────────────────────────────────────────────────
    const handleModeChange = async (newMode: OperationMode) => {
        try {
            setMode(newMode);
            await supabase.from('status').update({ mode_of_operation: newMode }).eq('id', 1);
        } catch (error) {
            console.error('Error in handleModeChange:', error);
            loadSystemStatus();
        }
    };

    const handleToggleLight = async (light: 'foyer' | 'porch', value: boolean) => {
        try {
            setSystemStatus(prev => ({ ...prev, [`${light}Light`]: value }));
            await supabase
                .from('status')
                .update({ [light]: value, last_activation: new Date().toISOString() })
                .eq('id', 1);
        } catch (error) {
            console.error('Error in handleToggleLight:', error);
            loadSystemStatus();
        }
    };

    const handleDownload = async (captureId: string) => {
        const capture = captures.find(c => c.id === captureId);
        if (!capture) {
            Alert.alert('Error', 'Video not found');
            return;
        }

        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'We need permission to save videos.');
                return;
            }

            setDownloadProgress(prev => ({ ...prev, [captureId]: 0 }));

            const videoUrl = getVideoStreamUrl(capture.file_name);
            const fileUri = (FileSystem as any).documentDirectory + capture.file_name;

            const callback = (downloadProgressData: any) => {
                const progress = downloadProgressData.totalBytesWritten / downloadProgressData.totalBytesExpectedToWrite;
                setDownloadProgress(prev => ({
                    ...prev,
                    [captureId]: Math.round(progress * 100),
                }));
            };

            const downloadResumable = FileSystem.createDownloadResumable(videoUrl, fileUri, {}, callback);
            const result = await downloadResumable.downloadAsync();

            if (result) {
                const asset = await MediaLibrary.createAssetAsync(result.uri);
                await MediaLibrary.createAlbumAsync('Solaris', asset, false);
                Alert.alert('Success', 'Video saved to your gallery!');
            }
        } catch (error) {
            console.error('Download error:', error);
            Alert.alert('Download Failed', 'Could not download video.');
        } finally {
            setDownloadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[captureId];
                return newProgress;
            });
        }
    };

    const handleDelete = async (captureId: string) => {
        try {
            await supabase.from('motion_events').delete().eq('id', captureId);
            loadCaptures();
        } catch (error) {
            console.error('Error in handleDelete:', error);
        }
    };

    const handleProfilePress = () => {
        console.log('Profile pressed');
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadDashboardData();
        setRefreshing(false);
    }, []);

    // ─────────────────────────────────────────────────
    // RENDER HELPERS
    // ─────────────────────────────────────────────────
    const renderModeContent = () => {
        switch (mode) {
            case 'manual':
                return <ManualControls foyerLight={systemStatus.foyerLight} porchLight={systemStatus.porchLight} onToggleLight={handleToggleLight} />;
            case 'scheduled':
                return <ScheduleControls />;
            default:
                return null;
        }
    };

    // ─────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────
    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" />
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    <Header userName="User" onProfilePress={handleProfilePress} />

                    {/* Pi Connection Status Indicator */}
                    <View style={styles.piStatus}>
                        <View style={[styles.statusDot, { backgroundColor: piConnected ? '#4CAF50' : '#F44336' }]} />
                        <Text style={styles.piStatusText}>Camera System: {piConnected ? 'Online' : 'Offline'}</Text>
                    </View>

                    <ModeSelector selectedMode={mode} onModeChange={handleModeChange} />
                    <StatusCard status={systemStatus} />
                    {renderModeContent()}

                    {/* Spacer for bottom sheet */}
                    <View style={{ height: 250 }} />
                </ScrollView>

                <BottomSheet
                    ref={bottomSheetRef}
                    index={0}
                    snapPoints={['15%', '50%', '90%']}
                    enablePanDownToClose={false}
                >
                    <RecentCaptures
                        captures={captures}
                        onDownload={handleDownload}
                        onDelete={handleDelete}
                        downloadProgress={downloadProgress}
                    />
                </BottomSheet>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

// ═══════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5'
    },
    scrollContent: {
        padding: 16
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    loadingText: {
        fontSize: 18,
        color: '#666'
    },
    piStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#FFF',
        borderRadius: 8,
        marginBottom: 16
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8
    },
    piStatusText: {
        fontSize: 14,
        color: '#666'
    },
});