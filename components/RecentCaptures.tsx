// components/RecentCaptures.tsx - CORRECTED VERSION
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import CaptureItem from './CaptureItem';
import { Capture } from '@/lib/types';

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
    // The @ts-ignore comments are no longer needed
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Recent Captures</Text>
                <Text style={styles.count}>{captures.length} videos</Text>
            </View>

            <BottomSheetFlatList<Capture>
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
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>📹</Text>
                        <Text style={styles.emptyText}>No captures yet</Text>
                        <Text style={styles.emptySubtext}>
                            Motion detected videos will appear here
                        </Text>
                    </View>
                }
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 2,
        borderBottomColor: '#000',
        backgroundColor: '#FFF',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    count: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    listContent: {
        padding: 16,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
        marginBottom: 4,
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
    },
});