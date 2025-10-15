// components/ModeSelector.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';

export default function ModeSelector({ selectedMode, onModeChange }) {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>Mode of Operation:</Text>
            <View style={styles.pickerContainer}>
                <Picker
                    selectedValue={selectedMode}
                    onValueChange={onModeChange}
                    style={styles.picker}
                >
                    <Picker.Item label="Automatic" value="automatic" />
                    <Picker.Item label="Manual" value="manual" />
                    <Picker.Item label="Scheduled" value="scheduled" />
                </Picker>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#D9D9D9',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    pickerContainer: {
        backgroundColor: '#D9D9D9',
        borderRadius: 8,
        minWidth: 150,
    },
    picker: {
        height: 40,
    },
});