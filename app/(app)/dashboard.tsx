// app/(app)/dashboard.tsx
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
    TouchableOpacity,
    Modal,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet from '@gorhom/bottom-sheet';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

// Import components
import Header from '../../components/Header';
import ModeSelector from '../../components/ModeSelector';
import StatusCard from '../../components/StatusCard';
import ManualControls from '../../components/ManualControls';
import ScheduleControls from '../../components/ScheduleControls';
import RecentCaptures from '../../components/RecentCaptures';
import { PiSetupFlow } from '@/components/PiSetupFlow';

// Import lib
import { supabase } from '@/lib/supabase';
import {
    checkPiConnection,
    getVideoStreamUrl,
    sendLightToggle,
    sendModeChange,
    getPiStatus, // ✅ pull status from Pi server
} from '@/lib/piServer';
import { SystemStatus, Capture, OperationMode } from '@/lib/types';
import { useAuth } from '@/_context/AuthContext';

// ═══════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════
interface SolarisDevice {
    id: string;
    user_id: string;
    name: string;
    pi_url: string;
}

// ═══════════════════════════════════════════════════
// HELPER FUNCTIONS
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
    // STATE & CONTEXT
    // ─────────────────────────────────────────────────
    const { session, signOut } = useAuth();
    const [currentDevice, setCurrentDevice] = useState<SolarisDevice | null>(null);

    // ✅ Mode is now sourced from Pi status (and user actions), not Supabase "status" table
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
    const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
    const [showSetupFlow, setShowSetupFlow] = useState(false);

    const bottomSheetRef = useRef<BottomSheet>(null);
    const statusIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const captureIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ─────────────────────────────────────────────────
    // DATA LOADING FUNCTIONS
    // ─────────────────────────────────────────────────
    const loadDevice = async (): Promise<SolarisDevice | null> => {
        try {
            const { data, error } = await supabase.from('devices').select('*').limit(1).maybeSingle();

            if (error) {
                console.error('Error loading device:', error);
                return null;
            }

            if (!data) {
                console.log('No device found for user.');
                setCurrentDevice(null);
                return null;
            }

            console.log('Loaded device:', data.name);
            const device = data as SolarisDevice;
            setCurrentDevice(device);
            return device;
        } catch (err) {
            console.error('Exception loading device:', err);
            return null;
        }
    };

    // ✅ LIVE status from Pi server (/api/status), not Supabase
    const loadSystemStatus = useCallback(async (piUrl?: string) => {
        const url = piUrl || currentDevice?.pi_url;
        if (!url) return;

        try {
            // 1) connectivity
            const isConnected = await checkPiConnection(url);
            setPiConnected(isConnected);

            if (!isConnected) {
                setSystemStatus((prev) => ({ ...prev, connected: false }));
                return;
            }

            // 2) live status
            const s = await getPiStatus(url);
            if (!s?.ok) return;

            // Pi is source of truth for mode + lights
            setMode((s.mode as OperationMode) || 'automatic');

            setSystemStatus((prev) => ({
                ...prev,
                connected: true,
                foyerLight: !!s.lights?.foyer,
                porchLight: !!s.lights?.porch,

                // These are not currently returned by the Pi server; keep last-known values:
                // lastActivated: prev.lastActivated,
                // battery: prev.battery,
            }));
        } catch (error) {
            console.error('Error loading Pi system status:', error);
        }
    }, [currentDevice?.pi_url]);

    // ✅ Captures still come from Supabase
    const loadCaptures = useCallback(
        async (deviceId?: string) => {
            const id = deviceId || currentDevice?.id;
            if (!id) return;

            try {
                const { data, error } = await supabase
                    .from('motion_events')
                    .select('*')
                    .eq('device_id', id)
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
                }
            } catch (error) {
                console.error('Error loading captures:', error);
            }
        },
        [currentDevice?.id]
    );

    const checkPi = useCallback(
        async (piUrl?: string) => {
            const url = piUrl || currentDevice?.pi_url;
            if (!url) return;
            const isConnected = await checkPiConnection(url);
            setPiConnected(isConnected);
        },
        [currentDevice?.pi_url]
    );

    const loadDeviceAndData = useCallback(async () => {
        setLoading(true);
        const device = await loadDevice();
        if (device) {
            await Promise.all([
                loadSystemStatus(device.pi_url), // ✅ from Pi
                loadCaptures(device.id),         // ✅ from Supabase
                checkPi(device.pi_url),          // (optional, loadSystemStatus already checks too)
            ]);
        }
        setLoading(false);
    }, [loadSystemStatus, loadCaptures, checkPi]);

    // ─────────────────────────────────────────────────
    // EFFECTS
    // ─────────────────────────────────────────────────
    // Initial load
    useEffect(() => {
        loadDeviceAndData();
    }, []);

    // Setup polling and app state listener
    useEffect(() => {
        // Clear any existing intervals
        if (statusIntervalRef.current) {
            clearInterval(statusIntervalRef.current);
        }
        if (captureIntervalRef.current) {
            clearInterval(captureIntervalRef.current);
        }

        // Only poll if we have a device and app is active
        if (isActive && currentDevice) {
            // Poll for status updates every 2 seconds (Pi)
            statusIntervalRef.current = setInterval(() => {
                loadSystemStatus();
            }, 2000);

            // Poll for captures every 30 seconds (Supabase)
            captureIntervalRef.current = setInterval(() => {
                loadCaptures();
            }, 30000);
        }

        // Listen for app state changes
        const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
            setIsActive(state === 'active');
            if (state === 'active' && currentDevice) {
                loadDeviceAndData();
            }
        });

        // Cleanup
        return () => {
            if (statusIntervalRef.current) {
                clearInterval(statusIntervalRef.current);
            }
            if (captureIntervalRef.current) {
                clearInterval(captureIntervalRef.current);
            }
            subscription.remove();
        };
    }, [isActive, currentDevice, loadSystemStatus, loadCaptures, loadDeviceAndData]);

    // ─────────────────────────────────────────────────
    // EVENT HANDLERS
    // ─────────────────────────────────────────────────
    const handleModeChange = async (newMode: OperationMode) => {
        if (!currentDevice) return;

        const previousMode = mode;
        setMode(newMode);

        try {
            const ok = await sendModeChange(currentDevice.pi_url, newMode);
            if (!ok) throw new Error('Pi rejected mode change');

            // ✅ confirm from Pi (source of truth)
            await loadSystemStatus(currentDevice.pi_url);
        } catch (err: any) {
            console.error(err);
            setMode(previousMode);
            Alert.alert('Error', err?.message || 'Failed to change mode');
        }
    };

    const handleToggleLight = async (light: 'foyer' | 'porch', value: boolean) => {
        if (!currentDevice) return;

        // Store previous value for rollback
        const previousValue = systemStatus[`${light}Light` as keyof SystemStatus];

        // Optimistic update
        setSystemStatus((prev) => ({
            ...prev,
            [`${light}Light`]: value,
        }));

        const success = await sendLightToggle(currentDevice.pi_url, light, value);
        if (!success) {
            Alert.alert('Error', 'Failed to toggle light. Device may be offline.');
            // Revert optimistic update
            setSystemStatus((prev) => ({
                ...prev,
                [`${light}Light`]: previousValue,
            }));
            return;
        }

        // ✅ re-sync from Pi after toggle
        await loadSystemStatus(currentDevice.pi_url);
    };

    const handleDownload = async (captureId: string) => {
        if (!currentDevice) return;

        const capture = captures.find((c) => c.id === captureId);
        if (!capture || !capture.file_name) {
            Alert.alert('Error', 'Video not found');
            return;
        }

        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'We need permission to save videos to your gallery.');
                return;
            }

            setDownloadProgress((prev) => ({ ...prev, [captureId]: 0 }));
            const videoUrl = getVideoStreamUrl(currentDevice.pi_url, capture.file_name);

            // Try to get cache directory
            let fileUri: string;
            try {
                const cacheDir = FileSystem.cacheDirectory;
                if (cacheDir) {
                    fileUri = `${cacheDir}${capture.file_name}`;
                } else {
                    throw new Error('Cache directory unavailable');
                }
            } catch {
                // Fallback: use a temp path
                fileUri = `/cache/${capture.file_name}`;
            }

            console.log('Downloading from:', videoUrl);
            console.log('Saving to:', fileUri);

            const downloadResumable = FileSystem.createDownloadResumable(
                videoUrl,
                fileUri,
                {},
                (downloadProgressData) => {
                    const progress =
                        downloadProgressData.totalBytesWritten /
                        downloadProgressData.totalBytesExpectedToWrite;
                    setDownloadProgress((prev) => ({
                        ...prev,
                        [captureId]: Math.round(progress * 100),
                    }));
                }
            );

            const result = await downloadResumable.downloadAsync();
            if (!result || !result.uri) {
                throw new Error('Download failed');
            }

            const asset = await MediaLibrary.createAssetAsync(result.uri);
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
        } catch (error: any) {
            console.error('Download error:', error);
            Alert.alert('Download Failed', error.message || 'Could not download video.');
        } finally {
            setDownloadProgress((prev) => {
                const newProgress = { ...prev };
                delete newProgress[captureId];
                return newProgress;
            });
        }
    };

    const handleDelete = async (captureId: string) => {
        Alert.alert('Delete Video', 'Are you sure you want to delete this video? This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const { error } = await supabase.from('motion_events').delete().eq('id', captureId);

                        if (error) {
                            console.error('Error deleting capture:', error);
                            Alert.alert('Error', 'Failed to delete video');
                        } else {
                            setCaptures((prev) => prev.filter((c) => c.id !== captureId));
                            Alert.alert('Success', 'Video deleted successfully');
                        }
                    } catch (error) {
                        console.error('Exception in delete:', error);
                        Alert.alert('Error', 'An unexpected error occurred');
                    }
                },
            },
        ]);
    };

    const handleSignOut = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
        ]);
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadDeviceAndData();
        setRefreshing(false);
    }, [loadDeviceAndData]);

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
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>Loading Your Device...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // "No Device" screen
    if (!currentDevice) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.noDeviceTitle}>No Device Connected</Text>
                    <Text style={styles.noDeviceSubtitle}>Please set up your SOLARIS device to get started.</Text>
                    <TouchableOpacity style={styles.setupButton} onPress={() => setShowSetupFlow(true)}>
                        <Text style={styles.setupButtonText}>+ Setup Device</Text>
                    </TouchableOpacity>

                    {/* Logout Button */}
                    <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
                        <Text style={styles.logoutButtonText}>Logout</Text>
                    </TouchableOpacity>
                </View>

                {/* Setup Flow Modal */}
                <Modal
                    visible={showSetupFlow}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowSetupFlow(false)}
                >
                    <SafeAreaView style={styles.setupModalContainer}>
                        <View style={styles.setupModalHeader}>
                            <TouchableOpacity onPress={() => setShowSetupFlow(false)}>
                                <Text style={styles.setupModalCloseButton}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <PiSetupFlow
                            userId={session?.user?.id || ''}
                            onSetupComplete={() => {
                                setShowSetupFlow(false);
                                loadDeviceAndData();
                            }}
                        />
                    </SafeAreaView>
                </Modal>
            </SafeAreaView>
        );
    }

    // Main Dashboard Render
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container} edges={['top']}>
                <StatusBar barStyle="dark-content" />
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    <Header userName={session?.user?.email?.split('@')[0] || 'User'} onProfilePress={handleSignOut} />

                    <View style={styles.piStatus}>
                        <View
                            style={[
                                styles.statusDot,
                                { backgroundColor: piConnected ? '#4CAF50' : '#F44336' },
                            ]}
                        />
                        <Text style={styles.piStatusText}>
                            {currentDevice.name}: {piConnected ? 'Online' : 'Offline'}
                        </Text>
                    </View>

                    <ModeSelector selectedMode={mode} onModeChange={handleModeChange} />
                    <StatusCard status={systemStatus} />
                    {renderModeContent()}

                    <View style={{ height: 250 }} />
                </ScrollView>

                <BottomSheet
                    ref={bottomSheetRef}
                    index={0}
                    snapPoints={['15%', '50%', '90%']}
                    enablePanDownToClose={false}
                    handleIndicatorStyle={styles.bottomSheetIndicator}
                >
                    <RecentCaptures
                        captures={captures}
                        piUrl={currentDevice.pi_url}
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
        padding: 20,
    },
    loadingText: {
        fontSize: 18,
        color: '#666',
        marginTop: 10,
    },
    noDeviceTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 10,
        textAlign: 'center',
    },
    noDeviceSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 30,
        paddingHorizontal: 20,
    },
    setupButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 12,
        minWidth: 200,
        marginBottom: 20,
    },
    setupButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
    },
    setupModalContainer: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    setupModalHeader: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    setupModalCloseButton: {
        fontSize: 28,
        color: '#007AFF',
        fontWeight: '300',
    },
    piStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#FFF',
        borderRadius: 8,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
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
        fontWeight: '500',
    },
    bottomSheetIndicator: {
        backgroundColor: '#CCC',
        width: 40,
    },
    logoutButton: {
        marginTop: 20,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FF3B30',
        backgroundColor: 'transparent',
    },
    logoutButtonText: {
        color: '#FF3B30',
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
    },
});