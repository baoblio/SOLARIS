// components/Header.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

interface HeaderProps {
    userName: string;
    onProfilePress?: () => void;
}

export default function Header({ userName, onProfilePress }: HeaderProps) {
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

                {/* Option 2: Use a local image (uncomment when you add your image) */}
                <Image
          source={require('../assets//images/profile-placeholder.png')}
          style={styles.profileImage}
        />
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
        borderRadius: 30,
        overflow: 'hidden',  // Important for circular image
    },
    profileImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
});