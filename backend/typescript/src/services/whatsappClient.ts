import { Client, LocalAuth, MessageTypes } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { WHATSAPP_CONFIG } from '../config/config';
import { saveMedia } from '../utils/mediaHandler';

export const initializeWhatsAppClient = () => {
    const client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: WHATSAPP_CONFIG.puppeteer
    });

    client.on('qr', (qr) => {
        console.log('QR RECEIVED', qr);
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
        console.log('Client is ready!');
    });

    client.on('message', async (msg) => {
        console.log('New message received:');
        console.log('From:', msg.from);
        console.log('Type:', msg.type);
        console.log('Timestamp:', new Date(msg.timestamp * 1000).toLocaleString());

        if (msg.type === MessageTypes.TEXT) {
            console.log('Text content:', msg.body);
        }
        else if ([MessageTypes.AUDIO, MessageTypes.VOICE, MessageTypes.IMAGE, MessageTypes.VIDEO].includes(msg.type)) {
            const filePath = await saveMedia(msg);
            if (filePath) {
                console.log(`Media saved to: ${filePath}`);
                await msg.reply(`Your ${msg.type.toLowerCase()} has been received and saved.`);
            }
        }
    });

    return client;
}; 