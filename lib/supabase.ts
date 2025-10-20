// lib/supabase.ts - UPDATED FOR NEW API
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system';

const SUPABASE_URL = 'https://qdpezamsvwxpvielmfcy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcGV6YW1zdnd4cHZpZWxtZmN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MzM4MTIsImV4cCI6MjA3NTMwOTgxMn0.6DfWyqnCv8BGB-0VEdd2ENWB2rgu56GhbwjYiz_Wav8';

const ExpoFileSystemStorage = {
    getItem: async (key: string): Promise<string | null> => {
        try {
            const dir = (FileSystem as any).documentDirectory;
            if (!dir) return null;

            const filePath = `${dir}${key}.txt`;

            // New API: getInfoAsync → FileSystem.getInfo
            const info = await FileSystem.getInfoAsync(filePath);
            if (!info.exists) return null;

            // New API: readAsStringAsync → FileSystem.readAsString
            return await FileSystem.readAsStringAsync(filePath);
        } catch (error) {
            console.warn('Storage getItem error:', error);
            return null;
        }
    },

    setItem: async (key: string, value: string): Promise<void> => {
        try {
            const dir = (FileSystem as any).documentDirectory;
            if (!dir) return;

            const filePath = `${dir}${key}.txt`;

            // New API: writeAsStringAsync → FileSystem.writeAsString
            await FileSystem.writeAsStringAsync(filePath, value);
        } catch (error) {
            console.warn('Storage setItem error:', error);
        }
    },

    removeItem: async (key: string): Promise<void> => {
        try {
            const dir = (FileSystem as any).documentDirectory;
            if (!dir) return;

            const filePath = `${dir}${key}.txt`;

            // New API: deleteAsync → FileSystem.delete with options
            await FileSystem.deleteAsync(filePath, { idempotent: true });
        } catch (error) {
            console.warn('Storage removeItem error:', error);
        }
    },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: ExpoFileSystemStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});