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
}

const LocationSearch = ({ onLocationSelect }: LocationSearchProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['geocode', searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [];
      // Using OpenStreetMap Nominatim API for geocoding (free and no API key required)
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}`
      );
      return response.data;
    },
    enabled: searchQuery.length > 2,
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
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
    <div className="w-full">
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Search for a location..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {isLoading && (
          <div className="absolute right-3 top-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {searchResults && searchResults.length > 0 && (
        <div className="mt-2 bg-white rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {searchResults.map((result: any) => (
            <button
              key={result.place_id}
              onClick={() => handleLocationSelect(result)}
              className="w-full px-4 py-2 text-left hover:bg-blue-50 focus:bg-blue-100 focus:outline-none"
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