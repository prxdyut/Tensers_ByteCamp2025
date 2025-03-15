import { useQuery } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';

interface Location {
  lat: number | null;
  lng: number | null;
  name: string;
}

interface AQIDisplayProps {
  location: Location;
}

interface AQIResponse {
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
}

const AQIDisplay = ({ location }: AQIDisplayProps) => {
  const { data: aqiData, isLoading, error, isError } = useQuery<AQIResponse, AxiosError>({
    queryKey: ['aqi', location.lat, location.lng],
    queryFn: async () => {
      try {
        console.log('Fetching AQI data for location:', {
          lat: location.lat,
          lng: location.lng,
          name: location.name
        });

        if (!location.lat || !location.lng) {
          throw new Error('Invalid location coordinates');
        }

        const response = await axios.get(
          `https://5748-136-232-248-186.ngrok-free.app/save_location?lat=${location.lat}&lon=${location.lng}`,
          {
            headers: {
              // 'ngrok-skip-browser-warning': '69420'
            }
          }
        );

        console.log('AQI data received:', response.data);
        return response.data;
      } catch (err) {
        console.error('Error fetching AQI data:', err);
        throw err;
      }
    },
    enabled: !!location.lat && !!location.lng,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  if (!location.lat || !location.lng) {
    return (
      <div className="text-center p-8 bg-white rounded-lg shadow-lg">
        <p className="text-gray-600">Please select a location to view air quality data.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8 bg-white rounded-lg shadow-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
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
      <div className="text-center p-8 bg-white rounded-lg shadow-lg">
        <div className="flex flex-col items-center space-y-4">
          <svg className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-600">{errorMessage}</p>
          {error instanceof AxiosError && error.response?.status !== 404 && (
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!aqiData || !aqiData.indexes || aqiData.indexes.length === 0) {
    return (
      <div className="text-center p-8 bg-white rounded-lg shadow-lg">
        <p className="text-red-600">No air quality data available for this location.</p>
      </div>
    );
  }

  const index = aqiData.indexes[0];
  const rgbColor = `rgba(${Math.round(index.color.red * 255)}, ${Math.round(index.color.green * 255)}, 0, 1)`;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">{location.name}</h2>
        <div 
          className="inline-block px-4 py-2 rounded-full text-white"
          style={{ backgroundColor: rgbColor }}
        >
          <span className="text-3xl font-bold">{index.aqiDisplay}</span>
          <span className="ml-2">{index.category}</span>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Air Quality Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Index Type</div>
            <div className="text-lg font-semibold">{index.displayName}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Main Pollutant</div>
            <div className="text-lg font-semibold">{index.dominantPollutant.toUpperCase()}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Region</div>
            <div className="text-lg font-semibold">{aqiData.regionCode.toUpperCase()}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Last Updated</div>
            <div className="text-lg font-semibold">
              {new Date(aqiData.dateTime).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-xl font-semibold mb-2">Air Quality Category</h3>
        <p className="text-gray-700">{index.category}</p>
      </div>
    </div>
  );
};

export default AQIDisplay; 