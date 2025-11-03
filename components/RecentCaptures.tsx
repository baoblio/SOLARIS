// components/RecentCaptures.tsx - FIXED SCROLLING VERSION
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
    // @ts-ignore
    // @ts-ignore
    return (
        <View style={styles.container}>
            {/* Header - FIXED POSITION */}
            <View style={styles.header}>
                <Text style={styles.title}>Recent Captures</Text>
                <Text style={styles.count}>{captures.length} videos</Text>
            </View>

            {/* Scrollable List */}
            <BottomSheetFlatList
                data={captures}
                keyExtractor={(item: { id: any; }) => item.id}
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
        color: '#000',
    },
    count: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    listContent: {
        padding: 16,
        paddingBottom: 40,  // Extra padding at bottom
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