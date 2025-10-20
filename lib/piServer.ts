// lib/piServer.ts

export const PI_SERVER_URL = 'https://transcripts-relate-appropriations-framed.trycloudflare.com';


export const getVideoStreamUrl = (filename: string): string => {
    return `${PI_SERVER_URL}/videos/${filename}`;
};

export const getThumbnailUrl = (filename: string): string => {
    return `${PI_SERVER_URL}/thumbnails/${filename.replace('.mp4', '.jpg')}`;
};

export const checkPiConnection = async (): Promise<boolean> => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${PI_SERVER_URL}/health`, {
            method: 'GET',
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response.ok;
    } catch (error) {
        console.error('Pi connection failed:', error);
        return false;
    }
};