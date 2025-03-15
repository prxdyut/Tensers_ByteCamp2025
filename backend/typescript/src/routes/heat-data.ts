import { Router } from 'express';
import { fetchWeatherApi } from 'openmeteo';

const router = Router();

// Helper function to get heat index category and color
function getHeatIndexInfo(temperature: number, humidity: number) {
    const heatIndex = calculateHeatIndex(temperature, humidity);
    
    if (heatIndex >= 54) {
        return {
            value: heatIndex,
            category: "Extreme Danger",
            color: "maroon",
            description: "Heat stroke highly likely. Outdoor activities should be suspended."
        };
    } else if (heatIndex >= 41) {
        return {
            value: heatIndex,
            category: "Danger",
            color: "red",
            description: "Heat cramps or heat exhaustion likely. Heat stroke possible with prolonged exposure."
        };
    } else if (heatIndex >= 32) {
        return {
            value: heatIndex,
            category: "Extreme Caution",
            color: "orange",
            description: "Heat cramps and heat exhaustion possible. Prolonged activity may lead to heat stroke."
        };
    } else if (heatIndex >= 27) {
        return {
            value: heatIndex,
            category: "Caution",
            color: "yellow",
            description: "Fatigue possible with prolonged exposure and activity."
        };
    } else {
        return {
            value: heatIndex,
            category: "Normal",
            color: "green",
            description: "No risk of heat-related illness under normal circumstances."
        };
    }
}

// Calculate Heat Index using temperature and humidity
function calculateHeatIndex(temperature: number, humidity: number): number {
    // Convert Celsius to Fahrenheit for the calculation
    const tempF = (temperature * 9/5) + 32;
    const hi = -42.379 + (2.04901523 * tempF) + (10.14333127 * humidity) 
        - (0.22475541 * tempF * humidity) - (6.83783e-3 * tempF**2) 
        - (5.481717e-2 * humidity**2) + (1.22874e-3 * tempF**2 * humidity) 
        + (8.5282e-4 * tempF * humidity**2) - (1.99e-6 * tempF**2 * humidity**2);
    
    // Convert back to Celsius
    return (hi - 32) * 5/9;
}

router.get('/', async (req, res) => {
    try {
        let latitude = req.query.latitude ? parseFloat(req.query.latitude as string) : null;
        let longitude = req.query.longitude ? parseFloat(req.query.longitude as string) : null;

        // If coordinates not provided, get from IP
        if (!latitude || !longitude) {
            try {
                const ipResponse = await fetch('http://ip-api.com/json/');
                const ipData = await ipResponse.json();
                latitude = ipData.lat;
                longitude = ipData.lon;
            } catch (error) {
                // Default to Mumbai coordinates if IP geolocation fails
                latitude = 19.0728;
                longitude = 72.8826;
            }
        }

        const params = {
            "latitude": latitude,
            "longitude": longitude,
            "hourly": [
                "temperature_2m",
                "relative_humidity_2m",
                "dew_point_2m",
                "apparent_temperature",
                "cloud_cover",
                "surface_pressure",
                "cloud_cover_low",
                "cloud_cover_mid",
                "cloud_cover_high",
                "et0_fao_evapotranspiration",
                "vapour_pressure_deficit",
                "wind_speed_10m",
                "wind_speed_100m",
                "wind_gusts_10m",
                "uv_index",
                "direct_radiation",
                "soil_temperature_0cm"
            ],
            "timezone": "auto"
        };

        const url = "https://api.open-meteo.com/v1/forecast";
        const responses = await fetchWeatherApi(url, params);

        const range = (start: number, stop: number, step: number) =>
            Array.from({ length: (stop - start) / step }, (_, i) => start + i * step);

        const response = responses[0];
        const hourly = response.hourly()!;

        // Calculate heat index and get status
        const currentTemp = hourly.variables(0)!.valuesArray()![0];
        const currentHumidity = hourly.variables(1)!.valuesArray()![0];
        const heatIndexInfo = getHeatIndexInfo(currentTemp, currentHumidity);

        const weatherData = {
            temperature: heatIndexInfo,
            hourly: {
                time: range(Number(hourly.time()), Number(hourly.timeEnd()), hourly.interval()).map(
                    (t) => new Date((t + response.utcOffsetSeconds()) * 1000)
                ),
                temperature: hourly.variables(0)!.valuesArray()!,
                humidity: hourly.variables(1)!.valuesArray()!,
                dewPoint: hourly.variables(2)!.valuesArray()!,
                feelsLike: hourly.variables(3)!.valuesArray()!,
                cloudCover: hourly.variables(4)!.valuesArray()!,
                pressure: hourly.variables(5)!.valuesArray()!,
                cloudCoverLow: hourly.variables(6)!.valuesArray()!,
                cloudCoverMid: hourly.variables(7)!.valuesArray()!,
                cloudCoverHigh: hourly.variables(8)!.valuesArray()!,
                evapotranspiration: hourly.variables(9)!.valuesArray()!,
                vaporPressure: hourly.variables(10)!.valuesArray()!,
                windSpeed: hourly.variables(11)!.valuesArray()!,
                windSpeedHigh: hourly.variables(12)!.valuesArray()!,
                windGusts: hourly.variables(13)!.valuesArray()!,
                uvIndex: hourly.variables(14)!.valuesArray()!,
                solarRadiation: hourly.variables(15)!.valuesArray()!,
                groundTemperature: hourly.variables(16)!.valuesArray()!,
                heatIndex: Array.from(hourly.variables(0)!.valuesArray()!).map((temp, i) => 
                    calculateHeatIndex(temp, hourly.variables(1)!.valuesArray()![i])
                )
            },
            location: {
                latitude,
                longitude,
                timezone: response.timezone(),
                utcOffset: response.utcOffsetSeconds()
            }
        };

        res.json(weatherData);
    } catch (error) {
        console.error('Error fetching heat wave data:', error);
        res.status(500).json({ error: 'Failed to fetch heat wave data' });
    }
});

export default router; 