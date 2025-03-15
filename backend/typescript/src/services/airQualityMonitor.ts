import { fetchWeatherApi } from 'openmeteo';
import { getWhatsAppClient } from './whatsappClient';
import { Client, Message } from 'whatsapp-web.js';

interface Location {
    lat: number;
    lon: number;
    display_name: string;
}

const POLLUTANT_THRESHOLDS = {
    pm25: { name: 'PM2.5', threshold: 35.5, unit: 'μg/m³', description: 'Fine particulate matter' },
    pm10: { name: 'PM10', threshold: 155, unit: 'μg/m³', description: 'Coarse particulate matter' },
    no2: { name: 'NO₂', threshold: 101, unit: 'μg/m³', description: 'Nitrogen Dioxide' },
    so2: { name: 'SO₂', threshold: 76, unit: 'μg/m³', description: 'Sulfur Dioxide' },
    co: { name: 'CO', threshold: 9401, unit: 'μg/m³', description: 'Carbon Monoxide' },
    o3: { name: 'O₃', threshold: 71, unit: 'μg/m³', description: 'Ozone' }
};

let isClientReady = false;
let messageQueue: { number: string; message: string }[] = [];

async function processMessageQueue() {
    if (!isClientReady || messageQueue.length === 0) return;

    const client = await getWhatsAppClient();
    
    while (messageQueue.length > 0) {
        const { number, message } = messageQueue.shift()!;
        try {
            await client.sendMessage(`${number}@c.us`, message);
            console.log('Queued message sent successfully');
        } catch (error) {
            console.error('Failed to send queued message:', error);
            // If sending fails, put it back in queue
            messageQueue.push({ number, message });
            break;
        }
    }
}

async function sendMessage(number: string, message: string) {
    if (!isClientReady) {
        console.log('Client not ready, queueing message');
        messageQueue.push({ number, message });
        return;
    }

    try {
        const client = await getWhatsAppClient();
        await client.sendMessage(`${number}@c.us`, message);
        console.log('Message sent successfully');
    } catch (error) {
        console.error('Failed to send message:', error);
        messageQueue.push({ number, message });
    }
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
                    'User-Agent': 'AirQualityMonitor/1.0' // Required by Nominatim
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

async function checkAirQuality(location: Location): Promise<string> {
    try {
        const response = await fetchWeatherApi("https://air-quality-api.open-meteo.com/v1/air-quality", {
            latitude: location.lat,
            longitude: location.lon,
            hourly: ["pm10", "pm2_5", "carbon_monoxide", "nitrogen_dioxide", "sulphur_dioxide", "ozone"],
            timezone: "auto",
            forecast_days: 1
        });

        if (!response?.[0]?.hourly()) {
            return "❌ Unable to fetch air quality data for this location.";
        }

        const hourly = response[0].hourly();
        
        const currentLevels = {
            pm25: hourly?.variables(1)?.valuesArray()?.[0] ?? 0,
            pm10: hourly?.variables(0)?.valuesArray()?.[0] ?? 0,
            co: hourly?.variables(2)?.valuesArray()?.[0] ?? 0,
            no2: hourly?.variables(3)?.valuesArray()?.[0] ?? 0,
            so2: hourly?.variables(4)?.valuesArray()?.[0] ?? 0,
            o3: hourly?.variables(5)?.valuesArray()?.[0] ?? 0
        };

        const warnings = Object.entries(currentLevels)
            .filter(([pollutant, value]) => {
                const threshold = POLLUTANT_THRESHOLDS[pollutant as keyof typeof POLLUTANT_THRESHOLDS];
                return value > 0 && value > threshold.threshold;
            })
            .map(([pollutant, value]) => {
                const info = POLLUTANT_THRESHOLDS[pollutant as keyof typeof POLLUTANT_THRESHOLDS];
                const percentAbove = ((value - info.threshold) / info.threshold * 100).toFixed(1);
                return {
                    name: info.name,
                    value: value.toFixed(1),
                    unit: info.unit,
                    percentAbove,
                    description: info.description
                };
            });

        // Create location name from the full address
        const locationParts = location.display_name.split(',');
        const cityName = locationParts[0];
        const stateName = locationParts.find(part => part.trim().includes('Pradesh') || 
                                                    part.trim().includes('Maharashtra') || 
                                                    part.trim().includes('Karnataka') ||
                                                    part.trim().includes('State'))?.trim() || '';

        if (warnings.length === 0) {
            return `✅ Air quality in ${cityName}, ${stateName} is currently within safe limits.\n\n` +
                   `📍 Location: ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`;
        }

        let message = `🚨 Air Quality Alert\n`;
        message += `📍 ${cityName}, ${stateName}\n`;
        message += `${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n`;
        
        warnings.forEach(warning => {
            message += `⚠️ ${warning.name} (${warning.description})\n`;
            message += `   Current: ${warning.value}${warning.unit}\n`;
            message += `   ${warning.percentAbove}% above safe level\n\n`;
        });

        message += `🛡️ Recommendations:\n`;
        message += `• Wear N95/KN95 masks outdoors\n`;
        message += `• Limit outdoor activities\n`;
        message += `• Keep windows closed\n`;
        message += `• Use air purifiers if available\n\n`;
        message += `📍 Coordinates: ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`;

        return message;

    } catch (error) {
        console.error('Error checking air quality:', error);
        return "❌ Error checking air quality. Please try again later.";
    }
}

export async function startAirQualityMonitoring(authorizedNumber: string) {
    const client = await getWhatsAppClient();
    
    // Listen for client ready event
    client.on('ready', () => {
        console.log('WhatsApp client is ready!');
        isClientReady = true;
        
        // Send welcome message once client is ready
        sendMessage(
            authorizedNumber,
            `👋 Welcome to Air Quality Monitor!\n\n` +
            `Send me any city name in India to check its air quality.\n\n` +
            `Example: "Mumbai" or "New Delhi" or "Bangalore"`
        );

        // Process any queued messages
        processMessageQueue();
    });

    // Listen for client disconnected event
    client.on('disconnected', () => {
        console.log('WhatsApp client disconnected');
        isClientReady = false;
    });

    // Listen for messages
    client.on('message', async (msg: Message) => {
        if (!isClientReady) {
            console.log('Client not ready, ignoring incoming message');
            return;
        }

        // Only respond to authorized number
        if (msg.from !== `${authorizedNumber}@c.us`) {
            return;
        }

        const cityQuery = msg.body.trim();

        try {
            // Send acknowledgment
            await msg.reply(`🔍 Searching for "${cityQuery}"...`);

            // Get location coordinates
            const location = await getLocationCoordinates(cityQuery);

            if (!location) {
                await sendMessage(
                    authorizedNumber,
                    `❌ Could not find location: "${cityQuery}"\n\n` +
                    `Please try:\n` +
                    `• Using the full city name\n` +
                    `• Adding the state name (e.g., "Mumbai, Maharashtra")\n` +
                    `• Checking for spelling errors`
                );
                return;
            }

            // Send "checking" message
            await sendMessage(authorizedNumber, `📍 Found location! Checking air quality...`);

            // Get and send air quality report
            const report = await checkAirQuality(location);
            await sendMessage(authorizedNumber, report);

        } catch (error) {
            console.error('Error processing request:', error);
            await sendMessage(
                authorizedNumber,
                '❌ An error occurred while processing your request. Please try again later.'
            );
        }
    });

    // Set up periodic queue processing
    setInterval(processMessageQueue, 5000); // Check queue every 5 seconds

    console.log('Air quality monitoring service started - waiting for WhatsApp client to be ready...');
} 