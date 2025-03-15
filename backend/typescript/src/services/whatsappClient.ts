import { Client, LocalAuth, MessageTypes } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { WHATSAPP_CONFIG } from '../config/config';
import { saveMedia } from '../utils/mediaHandler';

class WhatsAppClientSingleton {
    private static instance: Client | null = null;
    private static isInitializing: boolean = false;
    private static initPromise: Promise<Client> | null = null;

    private static async createInstance(): Promise<Client> {
        const client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: WHATSAPP_CONFIG.puppeteer
        });

        // Set up event handlers
        client.on('qr', (qr) => {
            console.log('QR RECEIVED', qr);
            qrcode.generate(qr, { small: true });
        });

        client.on('ready', () => {
            console.log('WhatsApp Client is ready!');
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
                    // await msg.reply(`Your ${msg.type.toLowerCase()} has been received and saved.`);
                }
            }
        });

        // Initialize the client
        await client.initialize();
        return client;
    }

    public static async getInstance(): Promise<Client> {
        if (!this.instance && !this.isInitializing) {
            this.isInitializing = true;
            this.initPromise = this.createInstance();
            
            try {
                this.instance = await this.initPromise;
                this.isInitializing = false;
            } catch (error) {
                this.isInitializing = false;
                this.initPromise = null;
                throw error;
            }
        } else if (this.isInitializing && this.initPromise) {
            // If initialization is in progress, wait for it to complete
            return await this.initPromise;
        }

        return this.instance!;
    }

    public static isClientReady(): boolean {
        return !!this.instance;
    }
}

export const initializeWhatsAppClient = async (): Promise<Client> => {
    return WhatsAppClientSingleton.getInstance();
};

export const getWhatsAppClient = async (): Promise<Client> => {
    return WhatsAppClientSingleton.getInstance();
};

export const isWhatsAppClientReady = (): boolean => {
    return WhatsAppClientSingleton.isClientReady();
}; 