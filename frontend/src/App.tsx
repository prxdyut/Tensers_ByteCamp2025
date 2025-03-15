import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';

// Components will be created next
import AQIDisplay from './components/AQIDisplay';
import LocationSearch from './components/LocationSearch';

interface Location {
  lat: number | null;
  lng: number | null;
  name: string;
}

interface GeolocationError {
  message: string;
  code: number;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
      cacheTime: 10 * 60 * 1000, // Keep data in cache for 10 minutes
    },
  },
});

function App() {
  const [location, setLocation] = useState<Location>({
    lat: null,
    lng: null,
    name: '',
  });
  const [locationError, setLocationError] = useState<string | null>(null);

  const handleGeolocationError = (error: GeolocationError) => {
    console.error('Geolocation error:', error);
    let errorMessage = 'Failed to get your location. ';
    
    switch (error.code) {
      case 1:
        errorMessage += 'Please allow location access to get local AQI data.';
        break;
      case 2:
        errorMessage += 'Position unavailable. Please try again or search manually.';
        break;
      case 3:
        errorMessage += 'Request timed out. Please try again or search manually.';
        break;
      default:
        errorMessage += 'Please try searching for a location manually.';
    }
    
    setLocationError(errorMessage);
  };

  useEffect(() => {
    // Get user's current location on component mount
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser. Please search for a location manually.');
      return;
    }

    setLocationError(null); // Reset error state before attempting to get location
    
    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Location obtained successfully:', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          name: 'Current Location',
        });
        setLocationError(null);
      },
      handleGeolocationError,
      geoOptions
    );
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 p-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-blue-800 mb-8 text-center">
            Air Quality Index Monitor
          </h1>
          
          <div className="space-y-6">
            {locationError && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      {locationError}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <LocationSearch onLocationSelect={setLocation} />
            <AQIDisplay location={location} />
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default App; 