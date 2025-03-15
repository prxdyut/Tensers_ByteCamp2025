export const PORT = 3000;

export const WHATSAPP_CONFIG = {
    authStrategy: 'local',
    puppeteer: {
        headless: true,
        args: ['--no-sandbox']
    }
};

export const MEDIA_PATHS = {
    AUDIO: 'media/audio',
    PHOTOS: 'media/photos',
    VIDEOS: 'media/videos'
}; 