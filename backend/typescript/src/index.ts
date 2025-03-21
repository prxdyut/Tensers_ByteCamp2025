import express from 'express';
import { PORT } from './config/config';
import { initializeWhatsAppClient } from './services/whatsappClient';
import { startEnvironmentalMonitoring } from './services/environmentalMonitor';
import routes from './routes';
import stats from './routes/stats';
import cors from 'cors';
import heatDataRouter from './routes/heat-data';
import audioRouter from './routes/audio';
const AUTHORIZED_NUMBER = '919152051206'; // Your number without + symbol

const app = express();

async function startServer() {
    try {
        // Initialize WhatsApp client first
        console.log('Initializing WhatsApp client...');
        const client = await initializeWhatsAppClient();
        
        // Setup middleware
        app.use(cors());
        app.use('/', routes);
        app.use('/stats', stats);
        app.use('/heat-data', heatDataRouter);
        app.use('/audio', audioRouter);

        // Start combined environmental monitoring service
        startEnvironmentalMonitoring(AUTHORIZED_NUMBER);

        // Start server
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

        // Handle process termination
        process.on('SIGTERM', async () => {
            console.log('Shutting down...');
            await client.destroy();
            process.exit(0);
        });

    } catch (error) {
        console.error('Server startup failed:', error);
        process.exit(1);
    }
}

startServer(); 