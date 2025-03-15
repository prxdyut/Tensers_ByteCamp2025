import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { LatLng, Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon issue in React
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/images/marker-icon-2x.png',
  iconUrl: 'assets/images/marker-icon.png',
  shadowUrl: 'assets/images/marker-shadow.png',
});

interface Location {
  lat: number;
  lng: number;
}

interface InteractiveMapProps {
  className?: string;
  location: Location | null;
  onLocationChange: (location: Location) => void;
}

// DraggableMarker component to handle marker interactions
function DraggableMarker({ location, onLocationChange }: { 
  location: Location; 
  onLocationChange: (location: Location) => void;
}) {
  const map = useMapEvents({
    click(e) {
      onLocationChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  useEffect(() => {
    if (location) {
      map.flyTo([location.lat, location.lng], map.getZoom());
    }
  }, [location, map]);

  return (
    <Marker
      position={[location.lat, location.lng]}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const position = marker.getLatLng();
          onLocationChange({ lat: position.lat, lng: position.lng });
        },
      }}
    />
  );
}

const InteractiveMap = ({ className = '', location, onLocationChange }: InteractiveMapProps) => {
  const defaultLocation = { lat: 51.505, lng: -0.09 };
  const currentLocation = location || defaultLocation;

  return (
    <div className={`card h-full rounded-lg border-0 ${className}`}>
      <div className="card-body p-6">
        <div className="flex items-center justify-between mb-5">
          <h6 className="font-bold text-lg mb-0">Interactive Location Map</h6>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            Click to place marker or drag existing marker
          </div>
        </div>
        <div className="h-[400px] rounded-lg overflow-hidden">
          <MapContainer
            center={[currentLocation.lat, currentLocation.lng]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <DraggableMarker location={currentLocation} onLocationChange={onLocationChange} />
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default InteractiveMap; 