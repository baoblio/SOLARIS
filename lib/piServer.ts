// lib/piServer.ts - PRODUCTION READY VERSION

/*
===========================================
SETUP INSTRUCTIONS:
===========================================
Two terminals needed for local testing:

Terminal 1 - Video Server:
  cd C:\solaris-test
  python video_server.py

Terminal 2 - Cloudflare Tunnel:
  cloudflared tunnel --url http://localhost:5000

The tunnel URL will be displayed in Terminal 2.
Update PI_SERVER_URL below with that URL.
===========================================
*/

import { supabase } from './supabase';

// ⚠️ IMPORTANT: Update this URL from Terminal 2 output
// Example: https://random-words-1234.trycloudflare.com
export const PI_SERVER_URL = 'https://voip-spare-eating-chest.trycloudflare.com';

// TODO: Get permanent domain from Cloudflare for production
// Instructions: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/

/**
 * Get the full streaming URL for a video file
 * @param filename - The video filename (e.g., "2024-01-15_14-30-00.mp4")
 * @returns Full URL to stream the video
 */
export const getVideoStreamUrl = (filename: string): string => {
    if (!filename) {
        console.warn('getVideoStreamUrl called with empty filename');
        return '';
    }
    return `${PI_SERVER_URL}/videos/${filename}`;
};

/**
 * Get the thumbnail URL for a video
 * @param filename - The video filename (e.g., "2024-01-15_14-30-00.mp4")
 * @returns Full URL to the thumbnail image
 */
export const getThumbnailUrl = (filename: string): string => {
    if (!filename) {
        console.warn('getThumbnailUrl called with empty filename');
        return '';
    }
    const thumbFilename = filename.replace('.mp4', '.jpg');
    return `${PI_SERVER_URL}/thumbnails/${thumbFilename}`;
};

/**
 * Check if the Pi server is reachable
 * @returns Promise<boolean> - true if server responds, false otherwise
 */
export const checkPiConnection = async (): Promise<boolean> => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${PI_SERVER_URL}/health`, {
            method: 'GET',
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            console.log('✅ Pi server is online');
            return true;
        }

        console.warn('⚠️ Pi server responded but not OK:', response.status);
        return false;
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.error('❌ Pi connection timeout (5s)');
        } else {
            console.error('❌ Pi connection failed:', error.message);
        }
        return false;
    }
};

/**
 * Get detailed video information from the server
 * @param filename - The video filename
 * @returns Promise with video metadata or null
 */
export const getVideoInfo = async (filename: string): Promise<any | null> => {
    try {
        const response = await fetch(`${PI_SERVER_URL}/videos/${filename}/info`);

        if (!response.ok) {
            console.error('Failed to fetch video info:', response.status);
            return null;
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error getting video info:', error);
        return null;
    }
};

/**
 * List all available videos on the server
 * @returns Promise with array of video metadata
 */
export const listVideos = async (): Promise<any[]> => {
    try {
        const response = await fetch(`${PI_SERVER_URL}/videos`);

        if (!response.ok) {
            console.error('Failed to list videos:', response.status);
            return [];
        }

        const videos = await response.json();
        console.log(`📹 Found ${videos.length} videos on server`);
        return videos;
    } catch (error) {
        console.error('Error listing videos:', error);
        return [];
    }
};

/**
 * Delete a video from the server
 * @param filename - The video filename to delete
 * @returns Promise<boolean> - true if deleted successfully
 */
export const deleteVideoFromServer = async (filename: string): Promise<boolean> => {
    try {
        const response = await fetch(`${PI_SERVER_URL}/videos/${filename}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            console.log('✅ Video deleted from server:', filename);
            return true;
        }

        console.error('Failed to delete video:', response.status);
        return false;
    } catch (error) {
        console.error('Error deleting video:', error);
        return false;
    }
};

/**
 * Get server health and statistics
 * @returns Promise with server status object
 */
export const getServerHealth = async (): Promise<any | null> => {
    try {
        const response = await fetch(`${PI_SERVER_URL}/health`);

        if (!response.ok) {
            return null;
        }

        const health = await response.json();
        return health;
    } catch (error) {
        console.error('Error checking server health:', error);
        return null;
    }
};

/**
 * Test the connection and log detailed info
 * Useful for debugging connection issues
 */
export const testConnection = async (): Promise<void> => {
    console.log('🔍 Testing Pi server connection...');
    console.log('📡 Server URL:', PI_SERVER_URL);

    const isConnected = await checkPiConnection();

    if (isConnected) {
        const health = await getServerHealth();
        console.log('📊 Server health:', health);

        const videos = await listVideos();
        console.log(`📹 Videos available: ${videos.length}`);
    } else {
        console.log('❌ Cannot connect to Pi server');
        console.log('💡 Make sure:');
        console.log('   1. Video server is running (python video_server.py)');
        console.log('   2. Cloudflare tunnel is running (cloudflared tunnel --url ...)');
        console.log('   3. PI_SERVER_URL is updated with the correct tunnel URL');
    }
};

// Export server URL for use in other components if needed
export { PI_SERVER_URL as SERVER_URL };

// Type definitions for better TypeScript support
export interface VideoMetadata {
    filename: string;
    size: number;
    modified: number;
    duration?: number;
}

export interface ServerHealth {
    status: string;
    timestamp: string;
    video_count: number;
    video_dir?: string;
}

/**
 * Sync videos from Pi server to Supabase database
 * @returns Number of new videos added to database
 */
export const syncVideosToDatabase = async (): Promise<number> => {
    try {
        console.log('🔄 Syncing videos from Pi server to database...');

        // Get list of videos from Pi server
        const serverVideos = await listVideos();

        if (serverVideos.length === 0) {
            console.log('ℹ️ No videos found on Pi server');
            return 0;
        }

        console.log(`📹 Found ${serverVideos.length} videos on server`);

        // Get existing video filenames from database
        const { data: dbVideos, error: dbError } = await supabase
            .from('motion_events')
            .select('file_name');

        if (dbError) {
            console.error('Error fetching database videos:', dbError);
            return 0;
        }

        const existingFilenames = new Set(
            (dbVideos || []).map(v => v.file_name)
        );

        // Find videos that are on server but not in database
        const newVideos = serverVideos.filter(
            v => !existingFilenames.has(v.filename)
        );

        if (newVideos.length === 0) {
            console.log('✅ Database is already up to date');
            return 0;
        }

        console.log(`➕ Adding ${newVideos.length} new videos to database...`);

        // Insert new videos into database
        const inserts = newVideos.map(video => ({
            file_name: video.filename,
            file_path: `/videos/${video.filename}`,
            file_size: video.size || 0,
            duration: video.duration || null,
            detected_at: new Date(video.modified * 1000).toISOString(), // Convert Unix timestamp
            location: 'Front Door', // Default location
            user_id: null, // System-wide
        }));

        const { data, error } = await supabase
            .from('motion_events')
            .insert(inserts)
            .select();

        if (error) {
            console.error('Error inserting videos:', error);
            return 0;
        }

        console.log(`✅ Successfully added ${data?.length || 0} videos to database`);
        return data?.length || 0;
    } catch (error) {
        console.error('Error syncing videos:', error);
        return 0;
    }
};