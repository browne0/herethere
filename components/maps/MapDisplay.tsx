// components/maps/MapDisplay.tsx
'use client';

import { GoogleMap, Marker } from '@react-google-maps/api';
import type { Libraries } from '@react-google-maps/api/dist/utils/make-load-script-url';

import { Location } from '@/lib/types';

import { useGoogleMapsStatus } from './GoogleMapsProvider';

const GOOGLE_MAPS_LIBRARIES: Libraries = ['places'];

interface MapDisplayProps {
  location: Location;
  zoom?: number;
  className?: string;
}

export function MapDisplay({ location, zoom = 15, className }: MapDisplayProps) {
  const { isLoaded, loadError } = useGoogleMapsStatus();

  const center = {
    lat: location.latitude,
    lng: location.longitude,
  };

  if (loadError) {
    return <div className="text-red-500">Error loading Google Maps</div>;
  }

  if (!isLoaded) {
    return <div className="animate-pulse bg-gray-200 rounded-lg h-64"></div>;
  }

  return (
    <GoogleMap
      mapContainerClassName={`h-64 w-full rounded-lg ${className}`}
      center={center}
      zoom={zoom}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        streetViewControl: true,
        mapTypeControl: true,
      }}
    >
      <Marker position={center} />
    </GoogleMap>
  );
}
