import { Message, MessageTypes } from 'whatsapp-web.js';
import path from 'path';
import fs from 'fs';
import { MEDIA_PATHS } from '../config/config';

export const getMediaDirectory = (messageType: MessageTypes) => {
    switch (messageType) {
        case MessageTypes.AUDIO:
        case MessageTypes.VOICE:
            return path.join(__dirname, '..', MEDIA_PATHS.AUDIO);
        case MessageTypes.IMAGE:
            return path.join(__dirname, '..', MEDIA_PATHS.PHOTOS);
        case MessageTypes.VIDEO:
            return path.join(__dirname, '..', MEDIA_PATHS.VIDEOS);
        default:
            return null;
    }
};

export const saveMedia = async (message: Message) => {
    try {
        const mediaDir = getMediaDirectory(message.type);
        if (!mediaDir) return null;

        const media = await message.downloadMedia();
        if (!media) return null;

        if (!fs.existsSync(mediaDir)) {
            fs.mkdirSync(mediaDir, { recursive: true });
        }

        const timestamp = new Date().getTime();
        const extension = media.mimetype.split('/')[1].split(';')[0];
        const filename = `${timestamp}-${message.id.toString().replace(/[^a-zA-Z0-9]/g, '')}.${extension}`;
        const filePath = path.join(mediaDir, filename);

        fs.writeFileSync(filePath, Buffer.from(media.data, 'base64'));
        return filePath;
    } catch (error) {
        console.error('Error saving media:', error);
        return null;
    }
}; 