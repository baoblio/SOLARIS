// components/CaptureItem.tsx - WITH PROGRESS BAR
import React, { useState } from 'react';
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
import { Video, ResizeMode } from 'expo-av';
import { Capture } from '../lib/types';
import { getVideoStreamUrl } from '../lib/piServer';

interface CaptureItemProps {
    capture: Capture;
    onDownload: () => void;
    onDelete: () => void;
    downloadProgress?: number;  // ← NEW (0-100 or undefined)
}

export default function CaptureItem({
                                        capture,
                                        onDownload,
                                        onDelete,
                                        downloadProgress,  // ← NEW
                                    }: CaptureItemProps) {
    const [showVideo, setShowVideo] = useState(false);
    const [loading, setLoading] = useState(false);

    const handlePlay = () => {
        setShowVideo(true);
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
            {/* Thumbnail */}
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

            {/* Info */}
            <View style={styles.infoContainer}>
                <Text style={styles.timestamp}>{capture.timestamp}</Text>
                {capture.location && (
                    <Text style={styles.location}>📍 {capture.location}</Text>
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
                                { width: `${downloadProgress}%` }
                            ]}
                        />
                    </View>
                    <Text style={styles.progressText}>Downloading... {downloadProgress}%</Text>
                </View>
            )}

            {/* Buttons */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.button, styles.playButtonStyle]}
                    onPress={handlePlay}
                    disabled={isDownloading}
                >
                    <Text style={styles.buttonText}>▶ Play</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.button,
                        styles.downloadButton,
                        isDownloading && styles.buttonDisabled
                    ]}
                    onPress={handleDownload}
                    disabled={isDownloading}
                >
                    <Text style={styles.buttonText}>
                        {isDownloading ? '⏳' : '⬇'} Download
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.button,
                        styles.deleteButton,
                        isDownloading && styles.buttonDisabled
                    ]}
                    onPress={handleDelete}
                    disabled={isDownloading}
                >
                    <Text style={styles.buttonText}>🗑 Delete</Text>
                </TouchableOpacity>
            </View>

            {/* Video Player Modal */}
            <Modal
                visible={showVideo}
                transparent
                animationType="slide"
                onRequestClose={() => setShowVideo(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{capture.location || 'Video'}</Text>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setShowVideo(false)}
                        >
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {loading && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color="#FFF" />
                            <Text style={styles.loadingText}>Loading video...</Text>
                        </View>
                    )}

                    <Video
                        source={{ uri: getVideoStreamUrl(capture.file_name) }}
                        style={styles.video}
                        useNativeControls
                        resizeMode={ResizeMode.CONTAIN}
                        shouldPlay
                        onLoadStart={() => setLoading(true)}
                        onLoad={() => setLoading(false)}
                        onError={(error) => {
                            setLoading(false);
                            Alert.alert('Error', 'Failed to load video. Check camera system connection.');
                            console.error('Video error:', error);
                        }}
                    />

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