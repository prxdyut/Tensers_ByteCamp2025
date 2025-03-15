import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface Location {
  lat: number | null;
  lng: number | null;
  name: string;
}

interface LocationSearchProps {
  onLocationSelect: (location: Location) => void;
  onSearch: (query: string) => void;
}

const LocationSearch = ({ onLocationSelect, onSearch }: LocationSearchProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'location' | 'aqi'>('location');

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['geocode', searchQuery, searchMode],
    queryFn: async () => {
      if (!searchQuery || searchMode === 'aqi') return [];
      // Using OpenStreetMap Nominatim API for geocoding (free and no API key required)
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}`
      );
      return response.data;
    },
    enabled: searchQuery.length > 2 && searchMode === 'location',
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (searchMode === 'aqi') {
      onSearch(e.target.value);
    }
  };

  const handleLocationSelect = (result: any) => {
    onLocationSelect({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      name: result.display_name,
    });
    setSearchQuery('');
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex gap-4 justify-center">
        <button
          onClick={() => setSearchMode('location')}
          className={`px-4 py-2 rounded-lg ${
            searchMode === 'location'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Search by Location
        </button>
        <button
          onClick={() => setSearchMode('aqi')}
          className={`px-4 py-2 rounded-lg ${
            searchMode === 'aqi'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Search by Area Name
        </button>
      </div>

      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearch}
          placeholder={
            searchMode === 'location'
              ? "Search for a location..."
              : "Enter area name (e.g., 'New York', 'London')"
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
        />
        {isLoading && (
          <div className="absolute right-3 top-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {searchMode === 'location' && searchResults && searchResults.length > 0 && (
        <div className="mt-2 bg-white rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {searchResults.map((result: any) => (
            <button
              key={result.place_id}
              onClick={() => handleLocationSelect(result)}
              className="w-full px-4 py-2 text-left text-gray-900 hover:bg-blue-50 focus:bg-blue-100 focus:outline-none"
            >
              {result.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationSearch; 