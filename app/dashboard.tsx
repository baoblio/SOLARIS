// app/dashboard.tsx - COMPLETE WITH VIDEO FUNCTIONS
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
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

// Import components
import Header from '../components/Header';
import ModeSelector from '../components/ModeSelector';
import StatusCard from '../components/StatusCard';
import ManualControls from '../components/ManualControls';
import ScheduleControls from '../components/ScheduleControls';
import RecentCaptures from '../components/RecentCaptures';

// Import lib
import { supabase } from '../lib/supabase';
import {
    checkPiConnection,
    getVideoStreamUrl,
    testConnection,
    syncVideosToDatabase
} from '../lib/piServer';
import { SystemStatus, Capture, OperationMode } from '../lib/types';

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
        // Test Pi connection on mount (development only)
        if (__DEV__) {
            testConnection();
        }

        loadDashboardData();

        // Poll for status updates every 3 seconds
        const statusInterval = setInterval(() => {
            if (isActive) {
                loadSystemStatus();
            }
        }, 3000);

        // Poll for captures and Pi connection every 30 seconds
        const captureInterval = setInterval(() => {
            if (isActive) {
                loadCaptures();
                checkPi();
            }
        }, 30000);

        // Listen for app state changes
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
        try {
            const { data, error } = await supabase
                .from('status')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            // Gracefully handle "0 rows" error
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

            if (error) throw error;

            if (data) {
                setSystemStatus({
                    connected: data.connection,
                    foyerLight: data.foyer,
                    porchLight: data.porch,
                    lastActivated: formatLastActivation(data.last_activation),
                    battery: data.battery_percentage || 0,
                });
                setMode(data.mode_of_operation as OperationMode);
            }
        } catch (error) {
            console.error('Error loading system status:', error);
        }
    };

    const loadCaptures = async () => {
        try {
            // First, sync videos from Pi server to database
            if (piConnected) {
                await syncVideosToDatabase();
            }

            // Then load from database
            const { data, error } = await supabase
                .from('motion_events')
                .select('*')
                .order('detected_at', { ascending: false })
                .limit(20);

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
                        location: event.location || 'Front Door',
                        thumbnail_data: event.thumbnail_data,
                        viewed: event.viewed || false,
                        starred: event.starred || false,
                    }))
                );
                console.log(`📹 Loaded ${data.length} video captures`);
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
            // Optimistic update
            setMode(newMode);

            const { error } = await supabase
                .from('status')
                .update({ mode_of_operation: newMode })
                .is('user_id', null);  // Changed from .eq('id', 2)

            if (error) {
                console.error('Error updating mode:', error);
                Alert.alert('Error', 'Failed to change mode');
                loadSystemStatus(); // Revert on error
            } else {
                console.log('Mode changed to:', newMode);
            }
        } catch (error) {
            console.error('Exception in handleModeChange:', error);
            loadSystemStatus();
        }
    };

    const handleToggleLight = async (light: 'foyer' | 'porch', value: boolean) => {
        try {
            // Optimistic update
            setSystemStatus(prev => ({
                ...prev,
                [`${light}Light`]: value
            }));

            const column = light === 'foyer' ? 'foyer' : 'porch';
            const { error } = await supabase
                .from('status')
                .update({
                    [column]: value,
                    last_activation: new Date().toISOString()
                })
                .is('user_id', null);  // Changed from .eq('id', 2)

            if (error) {
                console.error('Error toggling light:', error);
                Alert.alert('Error', 'Failed to toggle light');
                loadSystemStatus(); // Revert on error
            } else {
                console.log(`✅ ${light} light set to:`, value);
            }
        } catch (error) {
            console.error('Exception in handleToggleLight:', error);
            loadSystemStatus();
        }
    };

    const handleDownload = async (captureId: string) => {
        const capture = captures.find(c => c.id === captureId);
        if (!capture || !capture.file_name) {
            Alert.alert('Error', 'Video not found');
            return;
        }

        try {
            // Request media library permissions
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'We need permission to save videos to your gallery.');
                return;
            }

            // Initialize progress
            setDownloadProgress(prev => ({ ...prev, [captureId]: 0 }));

            // Get video URL from Pi server
            const videoUrl = getVideoStreamUrl(capture.file_name);
            const fileUri = FileSystem.documentDirectory + capture.file_name;

            console.log('Downloading from:', videoUrl);

            // Download with progress tracking
            const callback = (downloadProgressData: any) => {
                const progress =
                    downloadProgressData.totalBytesWritten /
                    downloadProgressData.totalBytesExpectedToWrite;

                setDownloadProgress(prev => ({
                    ...prev,
                    [captureId]: Math.round(progress * 100),
                }));
            };

            const downloadResumable = FileSystem.createDownloadResumable(
                videoUrl,
                fileUri,
                {},
                callback
            );

            const result = await downloadResumable.downloadAsync();

            if (result) {
                // Save to device gallery
                const asset = await MediaLibrary.createAssetAsync(result.uri);

                // Try to create/add to Solaris album
                try {
                    const album = await MediaLibrary.getAlbumAsync('Solaris');
                    if (album) {
                        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
                    } else {
                        await MediaLibrary.createAlbumAsync('Solaris', asset, false);
                    }
                } catch (albumError) {
                    console.log('Album creation skipped:', albumError);
                }

                Alert.alert('Success', 'Video saved to your gallery!');
                console.log('Video downloaded:', capture.file_name);
            }
        } catch (error: any) {
            console.error('Download error:', error);

            if (error.message?.includes('Network request failed')) {
                Alert.alert(
                    'Download Failed',
                    'Cannot reach the camera system. Please check if it\'s online.'
                );
            } else {
                Alert.alert('Download Failed', 'Could not download video.');
            }
        } finally {
            // Clear progress
            setDownloadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[captureId];
                return newProgress;
            });
        }
    };

    const handleDelete = async (captureId: string) => {
        try {
            Alert.alert(
                'Delete Video',
                'Are you sure you want to delete this video? This cannot be undone.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            const { error } = await supabase
                                .from('motion_events')
                                .delete()
                                .eq('id', captureId);

                            if (error) {
                                console.error('Error deleting capture:', error);
                                Alert.alert('Error', 'Failed to delete video');
                            } else {
                                console.log('Video deleted:', captureId);
                                // Optimistically remove from UI
                                setCaptures(prev => prev.filter(c => c.id !== captureId));
                            }
                        },
                    },
                ]
            );
        } catch (error) {
            console.error('Exception in handleDelete:', error);
        }
    };

    const handleProfilePress = () => {
        console.log('Profile pressed');
        // TODO: Navigate to profile/settings
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
                return (
                    <ManualControls
                        foyerLight={systemStatus.foyerLight}
                        porchLight={systemStatus.porchLight}
                        onToggleLight={handleToggleLight}
                    />
                );
            case 'scheduled':
                return <ScheduleControls />;
            case 'automatic':
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
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >
                    <Header userName="User" onProfilePress={handleProfilePress} />

                    {/* Pi Connection Status Indicator */}
                    <View style={styles.piStatus}>
                        <View style={[
                            styles.statusDot,
                            { backgroundColor: piConnected ? '#4CAF50' : '#F44336' }
                        ]} />
                        <Text style={styles.piStatusText}>
                            Camera System: {piConnected ? 'Online' : 'Offline'}
                        </Text>
                    </View>

                    <ModeSelector selectedMode={mode} onModeChange={handleModeChange} />
                    <StatusCard status={systemStatus} />
                    {renderModeContent()}

                    {/* Debug Info (Development Only) */}
                    {/*{__DEV__ && (
                        <View style={styles.debugSection}>
                            <Text style={styles.debugTitle}>Debug Info</Text>
                            <Text style={styles.debugText}>Mode: {mode}</Text>
                            <Text style={styles.debugText}>
                                Foyer: {systemStatus.foyerLight ? 'ON' : 'OFF'}
                            </Text>
                            <Text style={styles.debugText}>
                                Porch: {systemStatus.porchLight ? 'ON' : 'OFF'}
                            </Text>
                            <Text style={styles.debugText}>
                                Pi: {piConnected ? 'Connected' : 'Disconnected'}
                            </Text>
                            <Text style={styles.debugText}>
                                Videos: {captures.length}
                            </Text>
                        </View>
                    )}*/}

                    {/* Spacer for bottom sheet */}
                    <View style={{ height: 250 }} />
                </ScrollView>

                {/* Bottom Sheet with Video Captures */}
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
        backgroundColor: '#F5F5F5',
    },
    scrollContent: {
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 18,
        color: '#666',
    },
    piStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#FFF',
        borderRadius: 8,
        marginBottom: 16,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    piStatusText: {
        fontSize: 14,
        color: '#666',
    },
    debugSection: {
        marginTop: 20,
        padding: 16,
        backgroundColor: '#FFF3E0',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FF9800',
    },
    debugTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#E65100',
        marginBottom: 8,
    },
    debugText: {
        fontSize: 14,
        color: '#E65100',
        marginBottom: 4,
    },
});