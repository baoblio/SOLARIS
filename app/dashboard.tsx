// app/dashboard.tsx - COMPLETE TESTING VERSION
import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet from '@gorhom/bottom-sheet';

// Import components
import Header from '../components/Header';
import ModeSelector from '../components/ModeSelector';
import StatusCard from '../components/StatusCard';
import ManualControls from '../components/ManualControls';
import ScheduleControls from '../components/ScheduleControls';
import RecentCaptures from '../components/RecentCaptures';

// Import types
import { SystemStatus, Capture, OperationMode } from '@/lib/types';

export default function DashboardScreen() {
    // State
    const [mode, setMode] = useState<OperationMode>('automatic');
    const [foyerLight, setFoyerLight] = useState(false);
    const [porchLight, setPorchLight] = useState(false);
    const bottomSheetRef = useRef<BottomSheet>(null);

    // Test data for system status
    const testStatus: SystemStatus = {
        connected: true,
        foyerLight: foyerLight,
        porchLight: porchLight,
        lastActivated: '15 min',
        battery: 67,
    };

    // Test data for captures
    const testCaptures: Capture[] = [
        {
            id: '1',
            timestamp: '2024-01-06 10:30 AM',
            thumbnail_url: 'https://via.placeholder.com/300x200/CCCCCC/333333?text=Motion+Detected',
            video_url: 'https://example.com/video1.mp4',
            detected_at: '2024-01-06T10:30:00Z',
            location: 'Front Door',
        },
        {
            id: '2',
            timestamp: '2024-01-06 09:15 AM',
            thumbnail_url: 'https://via.placeholder.com/300x200/DDDDDD/444444?text=Activity+Detected',
            video_url: 'https://example.com/video2.mp4',
            detected_at: '2024-01-06T09:15:00Z',
            location: 'Backyard',
        },
    ];

    // Handlers
    const handleModeChange = (newMode: OperationMode) => {
        setMode(newMode);
        console.log('Mode changed to:', newMode);
    };

    const handleToggleLight = (light: 'foyer' | 'porch', value: boolean) => {
        console.log(`Toggling ${light} light to:`, value);
        if (light === 'foyer') {
            setFoyerLight(value);
        } else {
            setPorchLight(value);
        }
    };

    const handleDownload = (captureId: string) => {
        console.log('Download capture:', captureId);
        // TODO: Implement download functionality
    };

    const handleDelete = (captureId: string) => {
        console.log('Delete capture:', captureId);
        // TODO: Implement delete functionality
    };

    const handleProfilePress = () => {
        console.log('Profile pressed');
        // TODO: Navigate to profile/settings
    };

    // Render different content based on mode
    const renderModeContent = () => {
        switch (mode) {
            case 'manual':
                return (
                    <ManualControls
                        foyerLight={foyerLight}
                        porchLight={porchLight}
                        onToggleLight={handleToggleLight}
                    />
                );
            case 'scheduled':
                return <ScheduleControls />;
            case 'automatic':
            default:
                return null; // Just shows status in automatic mode
        }
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" />

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <Header userName="Test User" onProfilePress={handleProfilePress} />

                    {/* Mode Selector */}
                    <ModeSelector selectedMode={mode} onModeChange={handleModeChange} />

                    {/* Status Card */}
                    <StatusCard status={testStatus} />

                    {/* Mode-specific Content */}
                    {renderModeContent()}

                    {/* Debug Info */}
                    <View style={styles.debugSection}>
                        <Text style={styles.debugTitle}>✅ Debug Info:</Text>
                        <Text style={styles.debugText}>Current Mode: {mode}</Text>
                        <Text style={styles.debugText}>
                            Foyer Light: {foyerLight ? 'ON' : 'OFF'}
                        </Text>
                        <Text style={styles.debugText}>
                            Porch Light: {porchLight ? 'ON' : 'OFF'}
                        </Text>
                        <Text style={styles.debugText}>
                            Captures: {testCaptures.length} videos
                        </Text>
                    </View>

                    {/* Spacer for bottom sheet */}
                    <View style={{ height: 250 }} />
                </ScrollView>

                {/* Bottom Sheet with Recent Captures */}
                <BottomSheet
                    ref={bottomSheetRef}
                    index={0}
                    snapPoints={['15%', '50%', '90%']}
                    enablePanDownToClose={false}
                >
                    <RecentCaptures
                        captures={testCaptures}
                        onDownload={handleDownload}
                        onDelete={handleDelete}
                    />
                </BottomSheet>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    scrollContent: {
        padding: 16,
    },
    debugSection: {
        marginTop: 20,
        padding: 16,
        backgroundColor: '#E8F5E9',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    debugTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginBottom: 8,
    },
    debugText: {
        fontSize: 14,
        color: '#2E7D32',
        marginBottom: 4,
    },
});