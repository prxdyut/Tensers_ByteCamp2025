import { Router, Request, Response, RequestHandler } from 'express';
import { getWhatsAppClient } from '../services/whatsappClient';
import { AUTHORIZED_NUMBER } from '../config/config';

const router = Router();

interface Location {
    lat: number;
    lon: number;
    display_name: string;
}

interface FloodAlertResponse {
    success: boolean;
    message: string;
    location?: Location;
}

interface FloodAlertQuery {
    location?: string;
}

async function getLocationCoordinates(cityName: string): Promise<Location | null> {
    try {
        // Add India to the search query for better results
        const searchQuery = `${cityName}, India`;
        const encodedQuery = encodeURIComponent(searchQuery);
        
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1&countrycodes=in`,
            {
                headers: {
                    'User-Agent': 'FloodAlertSystem/1.0'
                }
            }
        );

        const data = await response.json();

        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon),
                display_name: data[0].display_name
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching location:', error);
        return null;
    }
}

const homeHandler: RequestHandler = (_req: Request, res: Response) => {
    res.send('WhatsApp Bot is running!');
};

const floodAlertHandler: RequestHandler<{}, FloodAlertResponse, {}, FloodAlertQuery> = async (req, res, next) => {
    try {
        const location = req.query.location;
        
        if (!location || typeof location !== 'string') {
            res.status(400).json({ 
                success: false, 
                message: 'Location parameter is required' 
            });
            return;
        }

        // Get location coordinates
        const coordinates = await getLocationCoordinates(location);
        
        if (!coordinates) {
            res.status(404).json({ 
                success: false, 
                message: 'Location not found' 
            });
            return;
        }

        // Create the flood alert message
        const locationParts = coordinates.display_name.split(',');
        const cityName = locationParts[0];
        const stateName = locationParts.find(part => 
            part.trim().includes('Pradesh') || 
            part.trim().includes('Maharashtra') || 
            part.trim().includes('Karnataka') ||
            part.trim().includes('State')
        )?.trim() || '';

        const message = `🚨 *FLOOD ALERT*\n\n` +
            `📍 Location: ${cityName}, ${stateName}\n` +
            `🕒 Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n` +
            `⚠️ Potential flood risk detected in your area.\n\n` +
            `🛡️ Safety Recommendations:\n` +
            `• Move to higher ground immediately\n` +
            `• Keep emergency supplies ready\n` +
            `• Follow local authorities' instructions\n` +
            `• Avoid walking/driving through flood waters\n` +
            `• Keep monitoring official updates\n\n` +
            `📍 Coordinates: ${coordinates.lat.toFixed(4)}, ${coordinates.lon.toFixed(4)}\n\n` +
            `Stay safe and keep this number handy for updates.`;

        // Send WhatsApp message
        const client = await getWhatsAppClient();
        await client.sendMessage(`${AUTHORIZED_NUMBER}@c.us`, message);

        res.json({ 
            success: true, 
            message: 'Flood alert sent successfully',
            location: coordinates
        });

    } catch (error) {
        console.error('Error sending flood alert:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send flood alert' 
        });
    }
};

router.get('/', homeHandler);
router.get('/flood-alert', floodAlertHandler);

export default router; 