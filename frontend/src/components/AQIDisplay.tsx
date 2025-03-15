import { useQuery } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { useEffect, useState } from 'react';

interface Location {
  lat: number | null;
  lng: number | null;
  name: string;
}

interface AQIDisplayProps {
  location: Location;
  searchQuery?: string;
}

interface AQIResponse {
  air_quality_data: {
    dateTime: string;
    indexes: {
      aqi: number;
      aqiDisplay: string;
      category: string;
      code: string;
      color: {
        green: number;
        red: number;
      };
      displayName: string;
      dominantPollutant: string;
    }[];
    regionCode: string;
  };
  place_name: string;
}

const AQIDisplay = ({ location, searchQuery }: AQIDisplayProps) => {
  const [browserLocation, setBrowserLocation] = useState<Location>({
    lat: null,
    lng: null,
    name: ''
  });

  useEffect(() => {
    if (navigator.geolocation && !location.lat && !location.lng && !searchQuery) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setBrowserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            name: 'Current Location'
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, [location.lat, location.lng, searchQuery]);

  const { data: aqiData, isLoading, error, isError } = useQuery<AQIResponse, AxiosError>({
    queryKey: ['aqi', location.lat || browserLocation.lat, location.lng || browserLocation.lng, searchQuery],
    queryFn: async () => {
      try {
        let url: string;
        
        if (searchQuery) {
          console.log('Fetching AQI data for search query:', searchQuery);
          url = `http://127.0.0.1:5000/search_area?query=${encodeURIComponent(searchQuery)}`;
        } else {
          const lat = location.lat || browserLocation.lat;
          const lng = location.lng || browserLocation.lng;

          console.log('Fetching AQI data for location:', {
            lat,
            lng,
            name: location.name || browserLocation.name
          });

          if (!lat || !lng) {
            throw new Error('Invalid location coordinates');
          }

          url = `http://127.0.0.1:5000/save_location?lat=${lat}&lon=${lng}`;
        }

        const response = await axios.get(url);
        console.log('AQI data received:', response.data);
        return response.data;
      } catch (err) {
        console.error('Error fetching AQI data:', err);
        throw err;
      }
    },
    enabled: (!!(location.lat && location.lng) || !!(browserLocation.lat && browserLocation.lng)) || !!searchQuery,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  if (!location.lat && !location.lng && !browserLocation.lat && !browserLocation.lng && !searchQuery) {
    return (
      <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100">
        <p className="text-gray-600">Please select a location or search for a place to view air quality data.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-600"></div>
      </div>
    );
  }

  if (isError) {
    const errorMessage = error instanceof AxiosError 
      ? error.response?.status === 404
        ? 'No air quality data available for this location.'
        : 'Failed to fetch air quality data. Please try again.'
      : 'An unexpected error occurred.';

    return (
      <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100">
        <div className="flex flex-col items-center space-y-4">
          <svg className="h-12 w-12 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-rose-600 font-medium">{errorMessage}</p>
          {error instanceof AxiosError && error.response?.status !== 404 && (
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!aqiData || !aqiData.air_quality_data || !aqiData.air_quality_data.indexes || aqiData.air_quality_data.indexes.length === 0) {
    return (
      <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100">
        <p className="text-rose-600 font-medium">No air quality data available for this location.</p>
      </div>
    );
  }

  const index = aqiData.air_quality_data.indexes[0];
  const rgbColor = `rgba(${Math.round(index.color.red * 255)}, ${Math.round(index.color.green * 255)}, 0, 0.95)`;
  const displayName = searchQuery ? aqiData.place_name : (location.name || browserLocation.name);

  // Get AQI category color
  const getAQIColor = (aqi: number) => {
    if (aqi <= 50) return 'bg-emerald-500';
    if (aqi <= 100) return 'bg-yellow-500';
    if (aqi <= 150) return 'bg-orange-500';
    if (aqi <= 200) return 'bg-red-500';
    if (aqi <= 300) return 'bg-purple-500';
    return 'bg-rose-900';
  };

  const aqiColor = getAQIColor(index.aqi);

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 p-8 space-y-8 transition-all duration-300">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">{displayName}</h2>
        <div className="flex flex-col items-center gap-2">
          <div 
            className={`${aqiColor} px-6 py-3 rounded-xl text-white shadow-lg transform transition-transform duration-200 hover:scale-105`}
          >
            <span className="text-4xl font-bold">{index.aqiDisplay}</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-2xl font-semibold text-gray-800">Air Quality Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50/80 backdrop-blur-sm p-4 rounded-xl border border-gray-100 transition-all duration-200 hover:shadow-md">
            <div className="text-sm text-gray-500 font-medium">Index Type</div>
            <div className="text-lg font-semibold text-gray-800">{index.displayName}</div>
          </div>
          <div className="bg-gray-50/80 backdrop-blur-sm p-4 rounded-xl border border-gray-100 transition-all duration-200 hover:shadow-md">
            <div className="text-sm text-gray-500 font-medium">Main Pollutant</div>
            <div className="text-lg font-semibold text-gray-800">{index.dominantPollutant.toUpperCase()}</div>
          </div>
          <div className="bg-gray-50/80 backdrop-blur-sm p-4 rounded-xl border border-gray-100 transition-all duration-200 hover:shadow-md">
            <div className="text-sm text-gray-500 font-medium">Region</div>
            <div className="text-lg font-semibold text-gray-800">{aqiData.air_quality_data.regionCode.toUpperCase()}</div>
          </div>
          <div className="bg-gray-50/80 backdrop-blur-sm p-4 rounded-xl border border-gray-100 transition-all duration-200 hover:shadow-md">
            <div className="text-sm text-gray-500 font-medium">Last Updated</div>
            <div className="text-lg font-semibold text-gray-800">
              {new Date(aqiData.air_quality_data.dateTime).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AQIDisplay;