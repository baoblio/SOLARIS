// components/CaptureItem.tsx - (COMPLETE WITH FIXED CLEANUP)
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Alert,
    Modal,
    ActivityIndicator,
} from 'react-native';
import {
    VideoView,
    useVideoPlayer,
    VideoSource,
} from 'expo-video';
import { Capture } from '@/lib/types';
import { getVideoStreamUrl } from '@/lib/piServer';

// ----------------------------------------------------------------
// Helper component to manage the video player hook
// ----------------------------------------------------------------
const VideoPlayerComponent = ({
                                  videoUri,
                                  onLoadingChange,
                                  onError,
                              }: {
    videoUri: string;
    onLoadingChange: (isLoading: boolean) => void;
    onError: (error: any) => void;
}) => {
    const videoSource: VideoSource = { uri: videoUri };

    const player = useVideoPlayer(videoSource, (player) => {
        player.play();
    });

    useEffect(() => {
        if (!player) return;

        // Set initial loading state
        onLoadingChange(true);

        try {
            // Subscribe to playing changes
            const playingSubscription = player.addListener('playingChange', (payload) => {
                if (payload.isPlaying) {
                    onLoadingChange(false);
                }
            });

            // Subscribe to status changes (this handles errors)
            const statusSubscription = player.addListener('statusChange', (payload) => {
                console.log('Status changed:', payload);

                if (payload.status === 'error' && payload.error) {
                    onLoadingChange(false);
                    onError(payload.error);
                } else if (payload.status === 'readyToPlay') {
                    onLoadingChange(false);
                } else if (payload.status === 'loading') {
                    onLoadingChange(true);
                }
            });

            // Cleanup
            return () => {
                try {
                    // Remove listeners first
                    playingSubscription?.remove();
                    statusSubscription?.remove();

                    // Then try to pause (wrapped in try-catch in case player is already released)
                    if (player) {
                        player.pause();
                    }
                } catch (error) {
                    // Ignore errors during cleanup - player might already be released
                    console.log('Video cleanup (safe to ignore):', error);
                }
            };
        } catch (err) {
            console.error('Error setting up video listeners:', err);
            onError(err);
        }
    }, [player, onLoadingChange, onError]);

    return (
        <VideoView
            player={player}
            style={styles.video}
            allowsFullscreen
            allowsPictureInPicture
            contentFit="contain"
        />
    );
};

// ----------------------------------------------------------------
// Main CaptureItem Component
// ----------------------------------------------------------------
interface CaptureItemProps {
    capture: Capture;
    piUrl: string;
    onDownload: () => void;
    onDelete: () => void;
    downloadProgress?: number;
}

export default function CaptureItem({
                                        capture,
                                        piUrl,
                                        onDownload,
                                        onDelete,
                                        downloadProgress,
                                    }: CaptureItemProps) {
    const [showVideo, setShowVideo] = useState(false);
    const [loading, setLoading] = useState(false);
    const [videoError, setVideoError] = useState<string | null>(null);

    const handlePlay = () => {
        setVideoError(null);
        setShowVideo(true);
    };

    const handleCloseVideo = () => {
        setShowVideo(false);
        setLoading(false);
        setVideoError(null);
    };

    const handleDownload = () => {
        Alert.alert(
            'Download Video',
            'Download this video to your device?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Download', onPress: onDownload },
            ]
        );
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Video',
            'Are you sure you want to delete this capture? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', onPress: onDelete, style: 'destructive' },
            ]
        );
    };

    const handleVideoError = (error: any) => {
        console.error('Video error:', error);
        setLoading(false);
        setVideoError('Failed to load video');
        Alert.alert(
            'Video Error',
            'Failed to load video. Please check your connection and try again.',
            [{ text: 'OK', onPress: handleCloseVideo }]
        );
    };

    const thumbnailUri = capture.thumbnail_data
        ? `data:image/jpeg;base64,${capture.thumbnail_data}`
        : 'https://via.placeholder.com/300x200/CCCCCC/666666?text=No+Thumbnail';

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1048576).toFixed(1)} MB`;
    };

    const isDownloading = downloadProgress !== undefined;

    return (
        <View style={styles.container}>
            {/* Thumbnail with Play Button */}
            <TouchableOpacity onPress={handlePlay} style={styles.thumbnailContainer}>
                <Image
                    source={{ uri: thumbnailUri }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                />
                <View style={styles.playOverlay}>
                    <View style={styles.playButton}>
                        <Text style={styles.playIcon}>▶</Text>
                    </View>
                </View>
                {capture.duration && (
                    <View style={styles.durationBadge}>
                        <Text style={styles.durationText}>{capture.duration}s</Text>
                    </View>
                )}
            </TouchableOpacity>

            {/* Info Section */}
            <View style={styles.infoContainer}>
                <Text style={styles.timestamp}>{capture.timestamp}</Text>
                {capture.location && (
                    <Text style={styles.location}>{capture.location}</Text>
                )}
                <Text style={styles.fileSize}>{formatFileSize(capture.file_size)}</Text>
            </View>

            {/* Download Progress Bar */}
            {isDownloading && (
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${downloadProgress}%` },
                            ]}
                        />
                    </View>
                    <Text style={styles.progressText}>
                        Downloading... {downloadProgress}%
                    </Text>
                </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.button, styles.playButtonStyle]}
                    onPress={handlePlay}
                    disabled={isDownloading}
                >
                    <Text style={styles.buttonText}>Play</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.button,
                        styles.downloadButton,
                        isDownloading && styles.buttonDisabled,
                    ]}
                    onPress={handleDownload}
                    disabled={isDownloading}
                >
                    <Text style={styles.buttonText}>
                        {isDownloading ? '⏳' : ''} Download
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.button,
                        styles.deleteButton,
                        isDownloading && styles.buttonDisabled,
                    ]}
                    onPress={handleDelete}
                    disabled={isDownloading}
                >
                    <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>
            </View>

            {/* Video Player Modal */}
            <Modal
                visible={showVideo}
                transparent={false}
                animationType="slide"
                onRequestClose={handleCloseVideo}
            >
                <View style={styles.modalContainer}>
                    {/* Modal Header with Close Button */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{capture.location || 'Video'}</Text>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={handleCloseVideo}
                        >
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Loading Indicator */}
                    {loading && !videoError && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color="#FFF" />
                            <Text style={styles.loadingText}>Loading video...</Text>
                        </View>
                    )}

                    {/* Error Message */}
                    {videoError && (
                        <View style={styles.errorOverlay}>
                            <Text style={styles.errorText}>⚠️ {videoError}</Text>
                        </View>
                    )}

                    {/* Video Player */}
                    {showVideo && !videoError && (
                        <VideoPlayerComponent
                            videoUri={getVideoStreamUrl(piUrl, capture.file_name)}
                            onLoadingChange={setLoading}
                            onError={handleVideoError}
                        />
                    )}

                    {/* Video Info Footer */}
                    <View style={styles.videoInfo}>
                        <Text style={styles.videoInfoText}>{capture.timestamp}</Text>
                        <Text style={styles.videoInfoText}>
                            {formatFileSize(capture.file_size)}
                        </Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ═══════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════
const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    thumbnailContainer: {
        position: 'relative',
        width: '100%',
        height: 200,
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 12,
    },
    thumbnail: {
        width: '100%',
        height: '100%',
        backgroundColor: '#E0E0E0',
    },
    playOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    playButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playIcon: {
        fontSize: 24,
        color: '#000',
        marginLeft: 4,
    },
    durationBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    durationText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
    infoContainer: {
        marginBottom: 12,
    },
    timestamp: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 4,
    },
    location: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    fileSize: {
        fontSize: 12,
        color: '#999',
    },
    progressContainer: {
        marginBottom: 12,
    },
    progressBar: {
        height: 6,
        backgroundColor: '#E0E0E0',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 6,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#2196F3',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 12,
        color: '#2196F3',
        fontWeight: '600',
        textAlign: 'center',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 3,
    },
    playButtonStyle: {
        backgroundColor: '#4CAF50',
    },
    downloadButton: {
        backgroundColor: '#2196F3',
    },
    deleteButton: {
        backgroundColor: '#F44336',
    },
    buttonDisabled: {
        backgroundColor: '#BDBDBD',
        opacity: 0.6,
    },
    buttonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 13,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: 50,
        backgroundColor: 'rgba(0,0,0,0.9)',
    },
    modalTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
    },
    closeButton: {
        padding: 8,
    },
    closeText: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: 'bold',
    },
    loadingOverlay: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -50,
        marginTop: -50,
        alignItems: 'center',
        zIndex: 10,
    },
    loadingText: {
        color: '#FFF',
        marginTop: 10,
        fontSize: 16,
    },
    errorOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        color: '#FFF',
        fontSize: 16,
        textAlign: 'center',
    },
    video: {
        flex: 1,
    },
    videoInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: 'rgba(0,0,0,0.9)',
    },
    videoInfoText: {
        color: '#FFF',
        fontSize: 14,
    },
});