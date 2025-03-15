import { Router } from 'express';
import { fetchWeatherApi } from 'openmeteo';

const router = Router();

// Add these interfaces for AQI calculation
interface AQIBreakpoint {
  min: number;
  max: number;
  aqiMin: number;
  aqiMax: number;
}

interface PollutantBreakpoints {
  [key: string]: AQIBreakpoint[];
}

// Comprehensive AQI breakpoints for all major pollutants
const AQI_BREAKPOINTS: PollutantBreakpoints = {
  pm25: [
    { min: 0, max: 12, aqiMin: 0, aqiMax: 50 },
    { min: 12.1, max: 35.4, aqiMin: 51, aqiMax: 100 },
    { min: 35.5, max: 55.4, aqiMin: 101, aqiMax: 150 },
    { min: 55.5, max: 150.4, aqiMin: 151, aqiMax: 200 },
    { min: 150.5, max: 250.4, aqiMin: 201, aqiMax: 300 },
    { min: 250.5, max: 500.4, aqiMin: 301, aqiMax: 500 }
  ],
  pm10: [
    { min: 0, max: 54, aqiMin: 0, aqiMax: 50 },
    { min: 55, max: 154, aqiMin: 51, aqiMax: 100 },
    { min: 155, max: 254, aqiMin: 101, aqiMax: 150 },
    { min: 255, max: 354, aqiMin: 151, aqiMax: 200 },
    { min: 355, max: 424, aqiMin: 201, aqiMax: 300 },
    { min: 425, max: 604, aqiMin: 301, aqiMax: 500 }
  ],
  no2: [
    { min: 0, max: 53, aqiMin: 0, aqiMax: 50 },
    { min: 54, max: 100, aqiMin: 51, aqiMax: 100 },
    { min: 101, max: 360, aqiMin: 101, aqiMax: 150 },
    { min: 361, max: 649, aqiMin: 151, aqiMax: 200 },
    { min: 650, max: 1249, aqiMin: 201, aqiMax: 300 },
    { min: 1250, max: 2049, aqiMin: 301, aqiMax: 500 }
  ],
  so2: [
    { min: 0, max: 35, aqiMin: 0, aqiMax: 50 },
    { min: 36, max: 75, aqiMin: 51, aqiMax: 100 },
    { min: 76, max: 185, aqiMin: 101, aqiMax: 150 },
    { min: 186, max: 304, aqiMin: 151, aqiMax: 200 },
    { min: 305, max: 604, aqiMin: 201, aqiMax: 300 },
    { min: 605, max: 1004, aqiMin: 301, aqiMax: 500 }
  ],
  co: [
    { min: 0, max: 4400, aqiMin: 0, aqiMax: 50 },
    { min: 4401, max: 9400, aqiMin: 51, aqiMax: 100 },
    { min: 9401, max: 12400, aqiMin: 101, aqiMax: 150 },
    { min: 12401, max: 15400, aqiMin: 151, aqiMax: 200 },
    { min: 15401, max: 30400, aqiMin: 201, aqiMax: 300 },
    { min: 30401, max: 50400, aqiMin: 301, aqiMax: 500 }
  ],
  o3: [
    { min: 0, max: 54, aqiMin: 0, aqiMax: 50 },
    { min: 55, max: 70, aqiMin: 51, aqiMax: 100 },
    { min: 71, max: 85, aqiMin: 101, aqiMax: 150 },
    { min: 86, max: 105, aqiMin: 151, aqiMax: 200 },
    { min: 106, max: 200, aqiMin: 201, aqiMax: 300 },
    { min: 201, max: 504, aqiMin: 301, aqiMax: 500 }
  ]
};

function calculateIndividualAQI(concentration: number, pollutant: string): number {
  const breakpoints = AQI_BREAKPOINTS[pollutant];
  if (!breakpoints) return 0;

  for (const bp of breakpoints) {
    if (concentration >= bp.min && concentration <= bp.max) {
      return Math.round(
        ((bp.aqiMax - bp.aqiMin) / (bp.max - bp.min)) * 
        (concentration - bp.min) + 
        bp.aqiMin
      );
    }
  }
  return 500; // For values above maximum breakpoint
}

function calculateDominantPollutant(pollutantAQIs: { [key: string]: number }): string {
  let maxAQI = -1;
  let dominant = '';
  
  for (const [pollutant, aqi] of Object.entries(pollutantAQIs)) {
    if (aqi > maxAQI) {
      maxAQI = aqi;
      dominant = pollutant;
    }
  }
  
  return dominant;
}

function getAQIInfo(aqi: number, dominantPollutant: string) {
  if (aqi <= 50) {
    return {
      category: "Good",
      color: "green",
      description: "Air quality is satisfactory, and air pollution poses little or no risk.",
      advice: "Perfect for outdoor activities!"
    };
  } else if (aqi <= 100) {
    return {
      category: "Moderate",
      color: "yellow",
      description: "Air quality is acceptable. However, there may be a risk for some people.",
      advice: "Sensitive individuals should consider reducing prolonged outdoor exertion."
    };
  } else if (aqi <= 150) {
    return {
      category: "Unhealthy for Sensitive Groups",
      color: "orange",
      description: `High levels of ${dominantPollutant.toUpperCase()}. Sensitive groups may experience health effects.`,
      advice: "People with respiratory or heart conditions should limit outdoor exposure."
    };
  } else if (aqi <= 200) {
    return {
      category: "Unhealthy",
      color: "red",
      description: "Everyone may begin to experience health effects.",
      advice: "Everyone should reduce prolonged outdoor exposure."
    };
  } else if (aqi <= 300) {
    return {
      category: "Very Unhealthy",
      color: "purple",
      description: "Health alert: everyone may experience more serious health effects.",
      advice: "Avoid outdoor activities. Stay indoors if possible."
    };
  } else {
    return {
      category: "Hazardous",
      color: "maroon",
      description: "Health warnings of emergency conditions.",
      advice: "Everyone should avoid all outdoor exertion."
    };
  }
}

router.get('/', async (req, res) => {
    try {
        let latitude = req.query.latitude ? parseFloat(req.query.latitude as string) : null;
        let longitude = req.query.longitude ? parseFloat(req.query.longitude as string) : null;

        // If coordinates not provided, get from IP
        if (!latitude || !longitude) {
            console.log("No coordinates provided, getting from IP");
            try {
                const ipResponse = await fetch('http://ip-api.com/json/');
                const ipData = await ipResponse.json();
                latitude = ipData.lat;
                longitude = ipData.lon;
                console.log("Coordinates fetched from IP:", latitude, longitude);
                console.log("IP Data:", ipData);
            } catch (error) {
                // Default to Mumbai coordinates if IP geolocation fails
                latitude = 19.0728;
                longitude = 72.8826;
                console.log("Failed to fetch coordinates from IP, using default coordinates:", latitude, longitude);
            }
        }

        const params = {
            "latitude": latitude,
            "longitude": longitude,
            "hourly": ["pm10", "pm2_5", "carbon_monoxide", "carbon_dioxide", "nitrogen_dioxide", "sulphur_dioxide", "ozone", "aerosol_optical_depth", "dust", "uv_index", "uv_index_clear_sky", "ammonia", "methane", "alder_pollen", "birch_pollen", "grass_pollen", "mugwort_pollen", "olive_pollen", "ragweed_pollen"],
            "timezone": "auto",
            "forecast_days": 1,
            "domains": "cams_global",
            "utm_source": "chatgpt.com"
        };

        const url = "https://air-quality-api.open-meteo.com/v1/air-quality";
        const responses = await fetchWeatherApi(url, params);

        const range = (start: number, stop: number, step: number) =>
            Array.from({ length: (stop - start) / step }, (_, i) => start + i * step);

        const response = responses[0];
        const hourly = response.hourly()!;

        // Calculate AQI for each pollutant
        const pollutantAQIs = {
            pm25: calculateIndividualAQI(hourly.variables(1)!.valuesArray()![0], 'pm25'),
            pm10: calculateIndividualAQI(hourly.variables(0)!.valuesArray()![0], 'pm10'),
            no2: calculateIndividualAQI(hourly.variables(4)!.valuesArray()![0], 'no2'),
            so2: calculateIndividualAQI(hourly.variables(5)!.valuesArray()![0], 'so2'),
            co: calculateIndividualAQI(hourly.variables(2)!.valuesArray()![0], 'co'),
            o3: calculateIndividualAQI(hourly.variables(6)!.valuesArray()![0], 'o3')
        };

        // Get the overall AQI (highest of all pollutants)
        const overallAQI = Math.max(...Object.values(pollutantAQIs));
        const dominantPollutant = calculateDominantPollutant(pollutantAQIs);
        const aqiInfo = getAQIInfo(overallAQI, dominantPollutant);

        const weatherData = {
            aqi: {
                value: overallAQI,
                ...aqiInfo,
                dominantPollutant,
                individualAQIs: pollutantAQIs
            },
            hourly: {
                time: range(Number(hourly.time()), Number(hourly.timeEnd()), hourly.interval()).map(
                    (t) => new Date((t + response.utcOffsetSeconds()) * 1000)
                ),
                pm10: hourly.variables(0)!.valuesArray()!,
                pm25: hourly.variables(1)!.valuesArray()!,
                carbonMonoxide: hourly.variables(2)!.valuesArray()!,
                carbonDioxide: hourly.variables(3)!.valuesArray()!,
                nitrogenDioxide: hourly.variables(4)!.valuesArray()!,
                sulphurDioxide: hourly.variables(5)!.valuesArray()!,
                ozone: hourly.variables(6)!.valuesArray()!,
                aerosolOpticalDepth: hourly.variables(7)!.valuesArray()!,
                dust: hourly.variables(8)!.valuesArray()!,
                uvIndex: hourly.variables(9)!.valuesArray()!,
                uvIndexClearSky: hourly.variables(10)!.valuesArray()!,
                ammonia: hourly.variables(11)!.valuesArray()!,
                methane: hourly.variables(12)!.valuesArray()!,
                alderPollen: hourly.variables(13)!.valuesArray()!,
                birchPollen: hourly.variables(14)!.valuesArray()!,
                grassPollen: hourly.variables(15)!.valuesArray()!,
                mugwortPollen: hourly.variables(16)!.valuesArray()!,
                olivePollen: hourly.variables(17)!.valuesArray()!,
                ragweedPollen: hourly.variables(18)!.valuesArray()!,
            },
            location: {
                latitude,
                longitude
            }
        };

        res.json(weatherData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch air quality data' });
    }
});

export default router; 