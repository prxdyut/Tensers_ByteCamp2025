export const PORT = process.env.PORT || 3000;

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

export const AUTHORIZED_NUMBER = '919152051206'; // Your number without + symbol 