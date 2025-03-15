import { fetchWeatherApi } from 'openmeteo';
import { getWhatsAppClient } from './whatsappClient';
import { Client, Message } from 'whatsapp-web.js';

interface Location {
    lat: number;
    lon: number;
    display_name: string;
}

interface HeatIndexThreshold {
    min: number;
    category: string;
    color: string;
    description: string;
    value?: number;
}

// Constants for both air quality and heat wave monitoring
const POLLUTANT_THRESHOLDS = {
    pm25: { name: 'PM2.5', threshold: 35.5, unit: 'μg/m³', description: 'Fine particulate matter' },
    pm10: { name: 'PM10', threshold: 155, unit: 'μg/m³', description: 'Coarse particulate matter' },
    no2: { name: 'NO₂', threshold: 101, unit: 'μg/m³', description: 'Nitrogen Dioxide' },
    so2: { name: 'SO₂', threshold: 76, unit: 'μg/m³', description: 'Sulfur Dioxide' },
    co: { name: 'CO', threshold: 9401, unit: 'μg/m³', description: 'Carbon Monoxide' },
    o3: { name: 'O₃', threshold: 71, unit: 'μg/m³', description: 'Ozone' }
};

const HEAT_INDEX_THRESHOLDS: HeatIndexThreshold[] = [
    { min: 54, category: "Extreme Danger", color: "maroon", description: "Heat stroke highly likely. Outdoor activities should be suspended." },
    { min: 41, category: "Danger", color: "red", description: "Heat cramps or heat exhaustion likely. Heat stroke possible with prolonged exposure." },
    { min: 32, category: "Extreme Caution", color: "orange", description: "Heat cramps and heat exhaustion possible. Prolonged activity may lead to heat stroke." },
    { min: 27, category: "Caution", color: "yellow", description: "Fatigue possible with prolonged exposure and activity." },
    { min: -Infinity, category: "Normal", color: "green", description: "No risk of heat-related illness under normal circumstances." }
];

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
        const searchQuery = `${cityName}, India`;
        const encodedQuery = encodeURIComponent(searchQuery);
        
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1&countrycodes=in`,
            {
                headers: {
                    'User-Agent': 'EnvironmentalMonitor/1.0'
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

// Calculate Heat Index using temperature and humidity
function calculateHeatIndex(temperature: number, humidity: number): number {
    const tempF = (temperature * 9/5) + 32;
    const hi = -42.379 + (2.04901523 * tempF) + (10.14333127 * humidity) 
        - (0.22475541 * tempF * humidity) - (6.83783e-3 * tempF**2) 
        - (5.481717e-2 * humidity**2) + (1.22874e-3 * tempF**2 * humidity) 
        + (8.5282e-4 * tempF * humidity**2) - (1.99e-6 * tempF**2 * humidity**2);
    
    return (hi - 32) * 5/9;
}

function getHeatIndexInfo(temperature: number, humidity: number): HeatIndexThreshold & { value: number } {
    const heatIndex = calculateHeatIndex(temperature, humidity);
    
    for (const threshold of HEAT_INDEX_THRESHOLDS) {
        if (heatIndex >= threshold.min) {
            return {
                ...threshold,
                value: heatIndex
            };
        }
    }
    
    return {
        ...HEAT_INDEX_THRESHOLDS[HEAT_INDEX_THRESHOLDS.length - 1],
        value: heatIndex
    };
}

async function checkEnvironmentalHazards(location: Location): Promise<string> {
    try {
        // Fetch air quality data
        const airQualityResponse = await fetchWeatherApi("https://air-quality-api.open-meteo.com/v1/air-quality", {
            latitude: location.lat,
            longitude: location.lon,
            hourly: ["pm10", "pm2_5", "carbon_monoxide", "nitrogen_dioxide", "sulphur_dioxide", "ozone"],
            timezone: "auto",
            forecast_days: 1
        });

        // Fetch weather data for heat wave analysis
        const weatherResponse = await fetchWeatherApi("https://api.open-meteo.com/v1/forecast", {
            latitude: location.lat,
            longitude: location.lon,
            hourly: ["temperature_2m", "relative_humidity_2m"],
            timezone: "auto"
        });

        if (!airQualityResponse?.[0]?.hourly() || !weatherResponse?.[0]?.hourly()) {
            return "❌ Unable to fetch environmental data for this location.";
        }

        const airQualityHourly = airQualityResponse[0].hourly();
        const weatherHourly = weatherResponse[0].hourly();
        
        // Get current air quality levels
        const currentLevels = {
            pm25: airQualityHourly?.variables(1)?.valuesArray()?.[0] ?? 0,
            pm10: airQualityHourly?.variables(0)?.valuesArray()?.[0] ?? 0,
            co: airQualityHourly?.variables(2)?.valuesArray()?.[0] ?? 0,
            no2: airQualityHourly?.variables(3)?.valuesArray()?.[0] ?? 0,
            so2: airQualityHourly?.variables(4)?.valuesArray()?.[0] ?? 0,
            o3: airQualityHourly?.variables(5)?.valuesArray()?.[0] ?? 0
        };

        // Get current temperature and humidity
        const currentTemp = weatherHourly?.variables(0)?.valuesArray()?.[0] ?? 0;
        const currentHumidity = weatherHourly?.variables(1)?.valuesArray()?.[0] ?? 0;

        // Process location name
        const locationParts = location.display_name.split(',');
        const cityName = locationParts[0];
        const stateName = locationParts.find(part => part.trim().includes('Pradesh') || 
                                                    part.trim().includes('Maharashtra') || 
                                                    part.trim().includes('Karnataka') ||
                                                    part.trim().includes('State'))?.trim() || '';

        // Check for air quality warnings
        const airQualityWarnings = Object.entries(currentLevels)
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

        // Check for heat wave conditions
        const heatIndexInfo = getHeatIndexInfo(currentTemp, currentHumidity);

        // Construct the message
        let message = `🌍 Environmental Hazards Report\n`;
        message += `📍 ${cityName}, ${stateName}\n`;
        message += `${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n`;

        // Heat wave section
        message += `🌡️ Heat Wave Status:\n`;
        message += `• Temperature: ${currentTemp.toFixed(1)}°C\n`;
        message += `• Humidity: ${currentHumidity.toFixed(1)}%\n`;
        message += `• Heat Index: ${heatIndexInfo.value.toFixed(1)}°C\n`;
        message += `• Status: ${heatIndexInfo.category}\n`;
        message += `• ${heatIndexInfo.description}\n\n`;

        // Air quality section
        if (airQualityWarnings.length === 0) {
            message += `✅ Air quality is currently within safe limits.\n`;
        } else {
            message += `⚠️ Air Quality Warnings:\n`;
            airQualityWarnings.forEach(warning => {
                message += `• ${warning.name} (${warning.description})\n`;
                message += `  Current: ${warning.value}${warning.unit}\n`;
                message += `  ${warning.percentAbove}% above safe level\n\n`;
            });
        }

        // Recommendations section
        message += `🛡️ Safety Recommendations:\n`;
        if (heatIndexInfo.value >= 32 || airQualityWarnings.length > 0) {
            message += `• Limit outdoor activities\n`;
            if (airQualityWarnings.length > 0) {
                message += `• Wear N95/KN95 masks outdoors\n`;
                message += `• Keep windows closed\n`;
                message += `• Use air purifiers if available\n`;
            }
            if (heatIndexInfo.value >= 32) {
                message += `• Stay hydrated\n`;
                message += `• Seek air-conditioned environments\n`;
                message += `• Wear light, loose-fitting clothing\n`;
            }
        } else {
            message += `• No special precautions needed at this time\n`;
        }

        message += `\n📍 Coordinates: ${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`;

        return message;

    } catch (error) {
        console.error('Error checking environmental hazards:', error);
        return "❌ Error checking environmental conditions. Please try again later.";
    }
}

export async function startEnvironmentalMonitoring(authorizedNumber: string) {
    const client = await getWhatsAppClient();
    
    // Listen for client ready event
    client.on('ready', () => {
        console.log('WhatsApp client is ready!');
        isClientReady = true;
        
        // Send welcome message
        sendMessage(
            authorizedNumber,
            `👋 Welcome to Environmental Hazards Monitor!\n\n` +
            `Send me any city name in India to check for:\n` +
            `• Air Quality Hazards\n` +
            `• Heat Wave Conditions\n\n` +
            `Example: "Mumbai" or "New Delhi" or "Bangalore"`
        );

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
            await msg.reply(`🔍 Searching for "${cityQuery}"...`);

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

            await sendMessage(authorizedNumber, `📍 Found location! Checking environmental conditions...`);

            const report = await checkEnvironmentalHazards(location);
            await sendMessage(authorizedNumber, report);

        } catch (error) {
            console.error('Error processing request:', error);
            await sendMessage(
                authorizedNumber,
                '❌ An error occurred while processing your request. Please try again later.'
            );
        }
    });

    setInterval(processMessageQueue, 5000);

    console.log('Environmental monitoring service started - waiting for WhatsApp client to be ready...');
} 