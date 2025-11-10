// components/RecentCaptures.tsx - FIXED VERSION
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import CaptureItem from './CaptureItem';
import { Capture } from '../lib/types';

interface RecentCapturesProps {
    captures: Capture[];
    onDownload: (captureId: string) => void;
    onDelete: (captureId: string) => void;
    downloadProgress: { [key: string]: number };
}

export default function RecentCaptures({
                                           captures,
                                           onDownload,
                                           onDelete,
                                           downloadProgress,
                                       }: RecentCapturesProps) {
    return (
        <BottomSheetFlatList
            data={captures}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
                <CaptureItem
                    capture={item}
                    onDownload={() => onDownload(item.id)}
                    onDelete={() => onDelete(item.id)}
                    downloadProgress={downloadProgress[item.id]}
                />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={true}
            ListHeaderComponent={
                <View style={styles.header}>
                    <Text style={styles.title}>Recent Captures</Text>
                    <Text style={styles.count}>{captures.length} videos</Text>
                </View>
            }
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>📹</Text>
                    <Text style={styles.emptyText}>No captures yet</Text>
                    <Text style={styles.emptySubtext}>
                        Motion detected videos will appear here
                    </Text>
                </View>
            }
        />
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 2,
        borderBottomColor: '#000',
        backgroundColor: '#FFF',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    count: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 100,  // Extra padding for last item
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
});