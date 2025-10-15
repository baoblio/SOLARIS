// components/RecentCaptures.js
import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import CaptureItem from './CaptureItem';

export default function RecentCaptures({ captures, onDownload, onDelete }) {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Recent Captures</Text>
                <Text style={styles.chevron}>︿</Text>
            </View>

            <BottomSheetFlatList
                data={captures}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <CaptureItem
                        capture={item}
                        onDownload={() => onDownload(item.id)}
                        onDelete={() => onDelete(item.id)}
                    />
                )}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No More Files</Text>
                }
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 2,
        borderBottomColor: '#000',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    chevron: {
        fontSize: 20,
    },
    listContent: {
        padding: 16,
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        marginTop: 20,
    },
});