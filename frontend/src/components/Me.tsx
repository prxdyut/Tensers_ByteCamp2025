import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Location {
  lat: number;
  lng: number;
}

function RecenterAutomatically({ lat, lng }: Location) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng]);
  return null;
}

// Add this interface for the weather data structure
interface WeatherData {
  aqi: {
    value: number;
    category: string;
    color: string;
    description: string;
  };
  hourly: {
    time: string[];
    pm10: number[];
    pm25: number[];
    carbonMonoxide: number[];
    carbonDioxide: number[];
    nitrogenDioxide: number[];
    sulphurDioxide: number[];
    ozone: number[];
    dust: number[];
    uvIndex: number[];
    ammonia: number[];
    methane: number[];
  }
}

// Add this interface for pollutant information
interface PollutantInfo {
  name: string;
  unit: string;
  description: string;
  hazardLevels: {
    good: number;
    moderate: number;
    unhealthy: number;
  };
}

// Add this constant for pollutant information
const POLLUTANT_INFO: Record<string, PollutantInfo> = {
  pm10: {
    name: "PM10",
    unit: "µg/m³",
    description: "Particulate matter less than 10 micrometers in diameter. Can cause respiratory issues and reduce visibility.",
    hazardLevels: {
      good: 50,
      moderate: 100,
      unhealthy: 150
    }
  },
  pm25: {
    name: "PM2.5",
    unit: "µg/m³",
    description: "Fine particulate matter less than 2.5 micrometers. Can penetrate deep into lungs and bloodstream.",
    hazardLevels: {
      good: 12,
      moderate: 35,
      unhealthy: 55
    }
  },
  carbonMonoxide: {
    name: "Carbon Monoxide (CO)",
    unit: "ppb",
    description: "Colorless, odorless gas that can cause headaches, dizziness, and can be lethal in high concentrations.",
    hazardLevels: {
      good: 4400,
      moderate: 9400,
      unhealthy: 12400
    }
  },
  carbonDioxide: {
    name: "Carbon Dioxide (CO2)",
    unit: "ppm",
    description: "Greenhouse gas that contributes to climate change. High indoor levels can cause drowsiness and headaches.",
    hazardLevels: {
      good: 1000,
      moderate: 2000,
      unhealthy: 5000
    }
  },
  nitrogenDioxide: {
    name: "Nitrogen Dioxide (NO2)",
    unit: "µg/m³",
    description: "Reddish-brown gas that can irritate airways and worsen respiratory conditions.",
    hazardLevels: {
      good: 40,
      moderate: 100,
      unhealthy: 200
    }
  },
  sulphurDioxide: {
    name: "Sulphur Dioxide (SO2)",
    unit: "µg/m³",
    description: "Toxic gas with a sharp odor that can cause breathing problems and contribute to acid rain.",
    hazardLevels: {
      good: 20,
      moderate: 80,
      unhealthy: 250
    }
  },
  ozone: {
    name: "Ozone (O3)",
    unit: "µg/m³",
    description: "Ground-level ozone can trigger asthma attacks and cause lung damage.",
    hazardLevels: {
      good: 100,
      moderate: 160,
      unhealthy: 200
    }
  },
  aerosolOpticalDepth: {
    name: "Aerosol Optical Depth",
    unit: "AOD",
    description: "Measure of aerosols in the entire atmosphere column. Indicates air clarity and pollution levels.",
    hazardLevels: {
      good: 0.1,
      moderate: 0.3,
      unhealthy: 0.5
    }
  },
  dust: {
    name: "Dust",
    unit: "µg/m³",
    description: "Airborne soil particles that can carry pollutants and cause respiratory issues.",
    hazardLevels: {
      good: 50,
      moderate: 100,
      unhealthy: 150
    }
  },
  uvIndex: {
    name: "UV Index",
    unit: "index",
    description: "Measure of UV radiation intensity. High levels can cause skin damage and eye problems.",
    hazardLevels: {
      good: 2,
      moderate: 5,
      unhealthy: 7
    }
  },
  uvIndexClearSky: {
    name: "UV Index (Clear Sky)",
    unit: "index",
    description: "Maximum possible UV index under clear sky conditions.",
    hazardLevels: {
      good: 2,
      moderate: 5,
      unhealthy: 7
    }
  },
  methane: {
    name: "Methane (CH4)",
    unit: "ppb",
    description: "Powerful greenhouse gas that contributes to global warming. Can be explosive in high concentrations.",
    hazardLevels: {
      good: 1800,
      moderate: 2000,
      unhealthy: 2500
    }
  }
};

// Helper function to format time
const formatTime = (timeStr: string) => {
  return new Date(timeStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

// Helper function to convert object to array
const objectToArray = (obj: Record<string, number | null>) => {
  return Object.values(obj);
};

// Helper function to determine hazard level
const getHazardLevel = (pollutant: string, value: number): string => {
  const info = POLLUTANT_INFO[pollutant];
  if (!info) return 'unknown';
  
  if (value <= info.hazardLevels.good) return 'good';
  if (value <= info.hazardLevels.moderate) return 'moderate';
  return 'unhealthy';
};

// Update the getHazardColor function to include dark mode colors
const getHazardColor = (level: string, isDark: boolean = true): string => {
  switch (level) {
    case 'good': return isDark ? 'text-green-400' : 'text-green-600';
    case 'moderate': return isDark ? 'text-yellow-300' : 'text-yellow-600';
    case 'unhealthy': return isDark ? 'text-red-400' : 'text-red-600';
    default: return isDark ? 'text-gray-300' : 'text-gray-600';
  }
};

// Update the PollutantCard component
const PollutantCard = ({ pollutant, value }: { pollutant: string; value: number }) => {
  const info = POLLUTANT_INFO[pollutant];
  const hazardLevel = getHazardLevel(pollutant, value);
  const hazardColor = getHazardColor(hazardLevel, true);

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-100">{info.name}</h3>
        <span className={`px-2 py-1 rounded text-sm ${hazardColor} bg-gray-700`}>
          {hazardLevel.toUpperCase()}
        </span>
      </div>
      <p className="text-3xl font-bold mb-2 text-gray-100">
        {value?.toFixed(1)} {info.unit}
      </p>
      <p className="text-sm text-gray-400">{info.description}</p>
      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-green-400">Good: ≤{info.hazardLevels.good}</span>
          <span className="text-yellow-300">Moderate: ≤{info.hazardLevels.moderate}</span>
          <span className="text-red-400">Unhealthy: &gt;{info.hazardLevels.moderate}</span>
        </div>
      </div>
    </div>
  );
};

// Add this component for the AQI display
const AQICard = ({ aqi }: { aqi: WeatherData['aqi'] }) => {
  const getBackgroundColor = (color: string) => {
    const colors = {
      green: 'bg-green-900/20',
      yellow: 'bg-yellow-900/20',
      orange: 'bg-orange-900/20',
      red: 'bg-red-900/20',
      purple: 'bg-purple-900/20',
      maroon: 'bg-red-950/20'
    };
    return colors[color as keyof typeof colors] || 'bg-gray-900/20';
  };

  const getTextColor = (color: string) => {
    const colors = {
      green: 'text-green-400',
      yellow: 'text-yellow-300',
      orange: 'text-orange-400',
      red: 'text-red-400',
      purple: 'text-purple-400',
      maroon: 'text-red-500'
    };
    return colors[color as keyof typeof colors] || 'text-gray-400';
  };

  return (
    <div className={`bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 ${getBackgroundColor(aqi.color)}`}>
      <h2 className="text-xl font-semibold mb-4 text-gray-100">Air Quality Index</h2>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className={`text-5xl font-bold ${getTextColor(aqi.color)}`}>
            {aqi.value}
          </p>
          <p className={`text-lg font-semibold mt-2 ${getTextColor(aqi.color)}`}>
            {aqi.category}
          </p>
        </div>
        <div className={`text-right ${getTextColor(aqi.color)}`}>
          <p className="text-sm opacity-90">{aqi.description}</p>
        </div>
      </div>
    </div>
  );
};

// Add this new component for the draggable marker
const DraggableMarker = ({ position, onPositionChange }: { 
  position: Location; 
  onPositionChange: (pos: Location) => void 
}) => {
  const markerRef = useRef(null);
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker) {
          const latLng = marker.getLatLng();
          onPositionChange({ lat: latLng.lat, lng: latLng.lng });
        }
      },
    }),
    [onPositionChange],
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={[position.lat, position.lng]}
      ref={markerRef}
    >
      <Popup>
        Drag me to check air quality at different locations
        <br />
        Lat: {position.lat.toFixed(4)}
        <br />
        Lng: {position.lng.toFixed(4)}
      </Popup>
    </Marker>
  );
};

const Me = () => {
  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isManualLocation, setIsManualLocation] = useState(false);

  // Function to handle map clicks
  const handleMapClick = useCallback((e: { latlng: { lat: number; lng: number } }) => {
    setLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
    setIsManualLocation(true);
  }, []);

  // Function to handle marker drag
  const handleMarkerDrag = useCallback((newPosition: Location) => {
    setLocation(newPosition);
    setIsManualLocation(true);
  }, []);

  // Function to reset to user's location
  const resetToUserLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setIsManualLocation(false);
        },
        (error) => {
          setError('Unable to retrieve your location');
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

  useEffect(() => {
    resetToUserLocation();
  }, [resetToUserLocation]);

  // Update the query to include location parameters
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['stats', location?.lat, location?.lng],
    queryFn: async () => {
      if (!location) throw new Error('Location not available');
      const response = await axios.get('http://localhost:3000/stats', {
        params: {
          latitude: location.lat,
          longitude: location.lng
        }
      });
      return response.data as WeatherData;
    },
    enabled: !!location,
  });

  // Format data for charts
  const formatChartData = (statsData: any) => {
    if (!statsData) return [];
    return statsData.hourly.time.map((time: string, index: number) => ({
      time: formatTime(time),
      pm10: objectToArray(statsData.hourly.pm10)[index],
      pm25: objectToArray(statsData.hourly.pm25)[index],
      carbonMonoxide: objectToArray(statsData.hourly.carbonMonoxide)[index],
      carbonDioxide: objectToArray(statsData.hourly.carbonDioxide)[index],
      ozone: objectToArray(statsData.hourly.ozone)[index],
      uvIndex: objectToArray(statsData.hourly.uvIndex)[index],
      methane: objectToArray(statsData.hourly.methane)[index],
    }));
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg">
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-100">Air Quality Dashboard</h1>
          {isManualLocation && (
            <button
              onClick={resetToUserLocation}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Reset to My Location
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Map Section */}
          <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden h-[600px] border border-gray-700">
            <MapContainer
              center={[location?.lat || 0, location?.lng || 0]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              className="dark-map"
              onClick={handleMapClick}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {location && (
                <DraggableMarker
                  position={location}
                  onPositionChange={handleMarkerDrag}
                />
              )}
              <RecenterAutomatically lat={location?.lat || 0} lng={location?.lng || 0} />
            </MapContainer>
            
            {/* Location Info */}
            {location && (
              <div className="absolute bottom-4 left-4 right-4 bg-gray-800 bg-opacity-90 p-4 rounded-lg border border-gray-700">
                <div className="text-gray-200 text-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold">Latitude:</span> {location.lat.toFixed(4)}
                      <span className="mx-4">|</span>
                      <span className="font-semibold">Longitude:</span> {location.lng.toFixed(4)}
                    </div>
                    {isManualLocation && (
                      <button
                        onClick={resetToUserLocation}
                        className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Current Readings Section */}
          <div className="space-y-6">
            {statsLoading ? (
              <div className="bg-gray-800 p-8 rounded-xl shadow-lg flex items-center justify-center border border-gray-700">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-400"></div>
              </div>
            ) : statsData ? (
              <>
                <AQICard aqi={statsData.aqi} />
                {/* Particulate Matter */}
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
                  <h2 className="text-xl font-semibold mb-4 text-gray-100">Particulate Matter</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <p className="text-sm text-gray-400">PM2.5</p>
                      <p className="text-2xl font-bold text-blue-400">
                        {objectToArray(statsData.hourly.pm25)[0]?.toFixed(1)} µg/m³
                      </p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <p className="text-sm text-gray-400">PM10</p>
                      <p className="text-2xl font-bold text-green-400">
                        {objectToArray(statsData.hourly.pm10)[0]?.toFixed(1)} µg/m³
                      </p>
                    </div>
                  </div>
                </div>

                {/* Gases */}
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
                  <h2 className="text-xl font-semibold mb-4 text-gray-100">Gas Levels</h2>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <p className="text-sm text-gray-400">CO</p>
                      <p className="text-2xl font-bold text-yellow-300">
                        {objectToArray(statsData.hourly.carbonMonoxide)[0]?.toFixed(1)}
                      </p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <p className="text-sm text-gray-400">CO2</p>
                      <p className="text-2xl font-bold text-purple-400">
                        {objectToArray(statsData.hourly.carbonDioxide)[0]?.toFixed(1)}
                      </p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <p className="text-sm text-gray-400">Ozone</p>
                      <p className="text-2xl font-bold text-indigo-400">
                        {objectToArray(statsData.hourly.ozone)[0]?.toFixed(1)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Other Metrics */}
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
                  <h2 className="text-xl font-semibold mb-4 text-gray-100">Other Metrics</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <p className="text-sm text-gray-400">UV Index</p>
                      <p className="text-2xl font-bold text-orange-400">
                        {objectToArray(statsData.hourly.uvIndex)[0]?.toFixed(1)}
                      </p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <p className="text-sm text-gray-400">Methane</p>
                      <p className="text-2xl font-bold text-teal-400">
                        {objectToArray(statsData.hourly.methane)[0]?.toFixed(1)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Graphs Section */}
                <div className="space-y-8">
                  {/* Particulate Matter Graph */}
                  <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
                    <h2 className="text-xl font-semibold mb-4 text-gray-100">Particulate Matter Trends</h2>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={formatChartData(statsData)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="time" stroke="#9CA3AF" />
                          <YAxis stroke="#9CA3AF" />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                            labelStyle={{ color: '#9CA3AF' }}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="pm25" stroke="#60A5FA" name="PM2.5" />
                          <Line type="monotone" dataKey="pm10" stroke="#34D399" name="PM10" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Gases Graph */}
                  <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
                    <h2 className="text-xl font-semibold mb-4 text-gray-100">Gas Levels Trends</h2>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={formatChartData(statsData)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="time" stroke="#9CA3AF" />
                          <YAxis stroke="#9CA3AF" />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                            labelStyle={{ color: '#9CA3AF' }}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="carbonMonoxide" stroke="#EAB308" name="CO" />
                          <Line type="monotone" dataKey="carbonDioxide" stroke="#8B5CF6" name="CO2" />
                          <Line type="monotone" dataKey="ozone" stroke="#6366F1" name="Ozone" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Other Metrics Graph */}
                  <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
                    <h2 className="text-xl font-semibold mb-4 text-gray-100">Other Metrics Trends</h2>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={formatChartData(statsData)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="time" stroke="#9CA3AF" />
                          <YAxis stroke="#9CA3AF" />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                            labelStyle={{ color: '#9CA3AF' }}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="uvIndex" stroke="#F97316" name="UV Index" />
                          <Line type="monotone" dataKey="methane" stroke="#14B8A6" name="Methane" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Pollutant Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(POLLUTANT_INFO).map(([key, info]) => (
                    <PollutantCard
                      key={key}
                      pollutant={key}
                      value={objectToArray(statsData.hourly[key as keyof typeof statsData.hourly])[0]}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-700">
                <p className="text-gray-400">No air quality data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Me;

// Add this CSS to your global styles or component
const darkMapStyles = `
  .dark-map {
    filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
  }
  .dark-map .leaflet-tile {
    filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
  }
  .dark-map .leaflet-marker-icon {
    filter: invert(100%) hue-rotate(180deg);
  }
`;