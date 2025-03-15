import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';

// Components
import AQIDisplay from './components/AQIDisplay';
import LocationSearch from './components/LocationSearch';
import Me from './components/Me';

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
      gcTime: 10 * 60 * 1000, // Keep data in cache for 10 minutes
    },
  },
});

function App() {
  const [location, setLocation] = useState<Location>({
    lat: null,
    lng: null,
    name: '',
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [locationError, setLocationError] = useState<string | null>(null);

  const fetchAQIData = async (lat: number, lng: number) => {
    try {
      const response = await axios.get(
        `http://127.0.0.1:5000/save_location?lat=${lat}&lon=${lng}`
      );
      console.log('Initial AQI data received:', response.data);
    } catch (error) {
      console.error('Error fetching initial AQI data:', error);
      setLocationError('Failed to fetch air quality data for your location. Please try searching manually.');
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setLocation({
      lat: null,
      lng: null,
      name: query
    });
  };

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
          <nav className="bg-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex">
                  <Link to="/" className="flex items-center px-4 hover:text-blue-600 font-medium">
                    Home
                  </Link>
                  <Link to="/me" className="flex items-center px-4 hover:text-blue-600 font-medium">
                    My Location
                  </Link>
                </div>
              </div>
            </div>
          </nav>

          <div className="p-6">
            <Routes>
              <Route
                path="/"
                element={
                  <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-12">
                      <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                        Air Quality Index Monitor
                      </h1>
                      <p className="text-gray-600 text-lg">
                        Get real-time air quality data for any location worldwide
                      </p>
                    </div>
                    <div className="space-y-8">
                      <LocationSearch onLocationSelect={setLocation} onSearch={handleSearch} />
                      <AQIDisplay location={location} searchQuery={searchQuery} />
                    </div>
                  </div>
                }
              />
              <Route path="/me" element={<Me />} />
            </Routes>
          </div>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;