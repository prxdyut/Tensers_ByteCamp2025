import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

interface Location {
  lat: number | null;
  lng: number | null;
  name: string;
}

interface MapProps {
  location: Location;
}

const Map = ({ location }: MapProps) => {
  const mapStyles = {
    height: '100%',
    width: '100%',
  };

  const defaultCenter = {
    lat: 0,
    lng: 0,
  };

  if (!location.lat || !location.lng) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">Select a location to view the map</p>
      </div>
    );
  }

  return (
    <LoadScript googleMapsApiKey="YOUR_GOOGLE_MAPS_API_KEY">
      <GoogleMap
        mapContainerStyle={mapStyles}
        zoom={13}
        center={{ lat: location.lat, lng: location.lng }}
      >
        <Marker position={{ lat: location.lat, lng: location.lng }} />
      </GoogleMap>
    </LoadScript>
  );
};

export default Map; 