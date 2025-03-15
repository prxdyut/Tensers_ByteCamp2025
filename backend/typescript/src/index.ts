import express from 'express';
import { PORT } from './config/config';
import { initializeWhatsAppClient } from './services/whatsappClient';
import routes from './routes';

const app = express();

// Initialize WhatsApp client
const client = initializeWhatsAppClient();
client.initialize();

// Routes
app.use('/', routes);

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
}); 