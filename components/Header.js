// components/Header.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function Header({ userName, onProfilePress }) {
    return (
        <View style={styles.container}>
            <View>
                <Text style={styles.greeting}>Hi, {userName}</Text>
                <Text style={styles.title}>Dashboard</Text>
            </View>

            <TouchableOpacity
                style={styles.profileButton}
                onPress={onProfilePress}
            >
                {/* Profile icon/image */}
                <View style={styles.profileCircle}>
                    <Text style={styles.profileIcon}>👤</Text>
                </View>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    greeting: {
        fontSize: 16,
        color: '#666',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#000',
    },
    profileButton: {
        width: 60,
        height: 60,
    },
    profileCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#5C1F1F',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileIcon: {
        fontSize: 30,
    },
});