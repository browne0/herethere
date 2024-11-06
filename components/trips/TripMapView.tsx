// components/trips/TripMapView.tsx
'use client';

import React from 'react';

import { Activity } from '@prisma/client';
import {
  GoogleMap,
  Marker,
  InfoWindow,
  DirectionsRenderer,
  useLoadScript,
} from '@react-google-maps/api';
import { format } from 'date-fns';
import { Loader2, MapPin, Clock, Home } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Accommodation } from '@/lib/trips';

import { DirectionsButton } from './DirectionsButton';

interface TripMapViewProps {
  tripId: string;
  activities: Activity[];
  onMarkerHover: (activityId: string | null) => void;
  onMarkerSelect: (activityId: string | null) => void;
  hoveredActivityId: string | null;
  selectedActivityId: string | null;
  accommodation?: Accommodation;
  date: string;
}

const defaultCenter = { lat: 40.7128, lng: -74.006 }; // New York City
const defaultZoom = 12;

const libraries: ('places' | 'geometry' | 'drawing' | 'visualization')[] = ['places'];

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  clickableIcons: false,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
  ],
};

export function TripMapView({
  activities,
  onMarkerHover,
  onMarkerSelect,
  hoveredActivityId,
  selectedActivityId,
  accommodation,
  date,
}: TripMapViewProps) {
  const [directions, setDirections] = React.useState<google.maps.DirectionsResult[]>([]);
  const [selectedMarker, setSelectedMarker] = React.useState<Activity | null>(null);
  const [map, setMap] = React.useState<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    libraries,
  });

  // Calculate routes between activities
  React.useEffect(() => {
    if (!isLoaded || !activities.length) return;

    async function calculateRoutes() {
      const newDirections: google.maps.DirectionsResult[] = [];
      const directionsService = new google.maps.DirectionsService();

      // Filter out activities without coordinates
      const validActivities = activities.filter(
        (activity): activity is Activity & { latitude: number; longitude: number } =>
          activity.latitude !== null && activity.longitude !== null
      );

      // Start from accommodation if available
      const points = accommodation ? [accommodation, ...validActivities] : validActivities;

      for (let i = 0; i < points.length - 1; i++) {
        const start = points[i];
        const end = points[i + 1];

        const origin: google.maps.LatLngLiteral = {
          lat: 'latitude' in start ? start.latitude : start.latitude,
          lng: 'longitude' in start ? start.longitude : start.longitude,
        };

        const destination: google.maps.LatLngLiteral = {
          lat: 'latitude' in end ? end.latitude : end.latitude,
          lng: 'longitude' in end ? end.longitude : end.longitude,
        };

        try {
          const result = await directionsService.route({
            origin,
            destination,
            travelMode: google.maps.TravelMode.DRIVING,
          });

          newDirections.push(result);
        } catch (error) {
          console.error('Direction service failed:', error);
        }
      }

      // Add route back to accommodation if available
      if (accommodation && activities.length > 0) {
        const lastActivity = activities[activities.length - 1];
        try {
          const result = await directionsService.route({
            origin: {
              lat: lastActivity.latitude!,
              lng: lastActivity.longitude!,
            },
            destination: {
              lat: accommodation.latitude,
              lng: accommodation.longitude,
            },
            travelMode: google.maps.TravelMode.DRIVING,
          });
          newDirections.push(result);
        } catch (error) {
          console.error('Failed to calculate return route:', error);
        }
      }

      setDirections(newDirections);
    }

    calculateRoutes();
  }, [isLoaded, activities, accommodation]);

  // Fit bounds when activities change
  React.useEffect(() => {
    if (!map || !activities.length) return;

    const bounds = new google.maps.LatLngBounds();

    if (accommodation) {
      bounds.extend({ lat: accommodation.latitude, lng: accommodation.longitude });
    }

    activities.forEach(activity => {
      if (activity.latitude && activity.longitude) {
        bounds.extend({ lat: activity.latitude, lng: activity.longitude });
      }
    });

    map.fitBounds(bounds, 50);
  }, [map, activities, accommodation]);

  const getMarkerIcon = (activity: Activity) => {
    const isHighlighted = hoveredActivityId === activity.id || selectedActivityId === activity.id;

    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: getMarkerColor(activity.type),
      fillOpacity: 1,
      strokeWeight: isHighlighted ? 3 : 2,
      strokeColor: isHighlighted ? '#000' : '#FFFFFF',
      scale: isHighlighted ? 12 : 10,
    };
  };

  const getMarkerColor = (type: Activity['type']) => {
    const colors: Record<Activity['type'], string> = {
      DINING: '#ef4444',
      SIGHTSEEING: '#3b82f6',
      ACCOMMODATION: '#22c55e',
      TRANSPORTATION: '#eab308',
      OTHER: '#6b7280',
    };
    return colors[type];
  };

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/20">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-full flex items-center justify-center bg-destructive/10">
        <Card>
          <CardContent>
            <p className="text-destructive">Failed to load map. Please check your API key.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      <GoogleMap
        mapContainerClassName="w-full h-full"
        options={mapOptions}
        onLoad={setMap}
        zoom={defaultZoom}
        center={defaultCenter}
      >
        {/* Accommodation Marker */}
        {accommodation && (
          <Marker
            position={{
              lat: accommodation.latitude,
              lng: accommodation.longitude,
            }}
            icon={{
              path: 'M10.5 0C4.959 0 0 4.959 0 10.5S10.5 32 10.5 32 21 16.041 21 10.5 16.041 0 10.5 0zm0 15a4.5 4.5 0 110-9 4.5 4.5 0 010 9z',
              fillColor: '#22c55e',
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#FFFFFF',
              scale: 1.5,
              anchor: new google.maps.Point(10.5, 32),
            }}
            onClick={() => setSelectedMarker(null)}
          />
        )}

        {/* Activity Markers */}
        {activities.map((activity, index) => (
          <Marker
            key={activity.id}
            position={{
              lat: activity.latitude!,
              lng: activity.longitude!,
            }}
            icon={getMarkerIcon(activity)}
            label={{
              text: String(index + 1),
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
            onMouseOver={() => onMarkerHover(activity.id)}
            onMouseOut={() => onMarkerHover(null)}
            onClick={() => {
              setSelectedMarker(activity);
              onMarkerSelect(activity.id);
            }}
            zIndex={
              hoveredActivityId === activity.id || selectedActivityId === activity.id ? 1000 : 1
            }
          />
        ))}

        {/* Route Lines */}
        {directions.map((direction, index) => (
          <DirectionsRenderer
            key={index}
            directions={direction}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#6b7280',
                strokeOpacity: 0.8,
                strokeWeight: 4,
              },
            }}
          />
        ))}

        {/* Info Window */}
        {selectedMarker && (
          <InfoWindow
            position={{
              lat: selectedMarker.latitude!,
              lng: selectedMarker.longitude!,
            }}
            onCloseClick={() => {
              setSelectedMarker(null);
              onMarkerSelect(null);
            }}
          >
            <div className="p-2 max-w-xs">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="font-medium">{selectedMarker.name}</h3>
                <Badge variant="secondary">{selectedMarker.type}</Badge>
              </div>
              {selectedMarker.address && (
                <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{selectedMarker.address}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {format(selectedMarker.startTime, 'h:mm a')} -{' '}
                  {format(selectedMarker.endTime, 'h:mm a')}
                </span>
              </div>
              {selectedMarker.notes && (
                <p className="mt-2 text-sm border-t pt-2">{selectedMarker.notes}</p>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
