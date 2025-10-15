// components/CaptureItem.js
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';

export default function CaptureItem({ capture, onDownload, onDelete }) {
    const handleDownload = () => {
        Alert.alert(
            'Download Video',
            'Download this capture to your device?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Download', onPress: onDownload }
            ]
        );
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Video',
            'Are you sure you want to delete this capture?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', onPress: onDelete, style: 'destructive' }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <Image
                source={{ uri: capture.thumbnail_url }}
                style={styles.thumbnail}
                resizeMode="cover"
            />
            <Text style={styles.timestamp}>{capture.timestamp}</Text>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.button, styles.downloadButton]}
                    onPress={handleDownload}
                >
                    <Text style={styles.buttonText}>Download</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.deleteButton]}
                    onPress={handleDelete}
                >
                    <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#D9D9D9',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    thumbnail: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        marginBottom: 8,
    },
    timestamp: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 8,
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
        marginHorizontal: 4,
    },
    downloadButton: {
        backgroundColor: '#2196F3',
    },
    deleteButton: {
        backgroundColor: '#F44336',
    },
    buttonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 14,
    },
});