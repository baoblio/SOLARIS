// lib/supabase.js
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import AsyncStorage from "@react-native-async-storage/async-storage";
const SUPABASE_URL = 'https://qdpezamsvwxpvielmfcy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcGV6YW1zdnd4cHZpZWxtZmN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MzM4MTIsImV4cCI6MjA3NTMwOTgxMn0.6DfWyqnCv8BGB-0VEdd2ENWB2rgu56GhbwjYiz_Wav8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage, // For persisting auth
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});