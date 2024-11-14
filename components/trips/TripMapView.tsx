'use client';

import React from 'react';

import { Activity, TripStatus } from '@prisma/client';
import {
  GoogleMap,
  Marker,
  InfoWindow,
  DirectionsRenderer,
  useLoadScript,
} from '@react-google-maps/api';
import { format } from 'date-fns';
import { Clock, Loader2, MapPin } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { useTripActivities } from '@/contexts/TripActivitiesContext';
import { Accommodation } from '@/lib/trips';

import { ActivityCategoryBadge } from '../activities/ActivityDetails';

interface TripMapViewProps {
  onMarkerHover: (activityId: string | null) => void;
  onMarkerSelect: (activityId: string | null) => void;
  hoveredActivityId: string | null;
  selectedActivityId: string | null;
  accommodation?: Accommodation;
}

const libraries: ('places' | 'geometry' | 'drawing' | 'visualization')[] = ['places'];

const getMarkerIcon = (activity: Activity, isHighlighted: boolean) => {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: getMarkerColor(activity.category),
    fillOpacity: 1,
    strokeWeight: isHighlighted ? 3 : 2,
    strokeColor: isHighlighted ? '#000' : '#FFFFFF',
    scale: isHighlighted ? 12 : 10,
  };
};

const getMarkerColor = (category: string) => {
  const colors: Record<string, string> = {
    beaches: '#06b6d4',
    city_sightseeing: '#2563eb',
    outdoor_adventures: '#059669',
    festivals_events: '#9333ea',
    food_exploration: '#ea580c',
    nightlife: '#4f46e5',
    shopping: '#db2777',
    spa_wellness: '#0d9488',
  };

  return colors[category] || '#6b7280';
};

export function TripMapView({
  onMarkerHover,
  onMarkerSelect,
  hoveredActivityId,
  selectedActivityId,
  accommodation,
}: TripMapViewProps) {
  const { activities, trip, isGenerating, error } = useTripActivities();
  const [directions, setDirections] = React.useState<google.maps.DirectionsResult[]>([]);
  const [selectedMarker, setSelectedMarker] = React.useState<Activity | null>(null);
  const [map, setMap] = React.useState<google.maps.Map | null>(null);

  const mapOptions: google.maps.MapOptions = {
    disableDefaultUI: false,
    clickableIcons: false,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    // zoom: 12,
    // center: { lat: trip.latitude!, lng: trip.longitude! },
    styles: [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
      },
    ],
  };

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    libraries,
  });

  // Only calculate routes when we have verified activities
  // React.useEffect(() => {
  //   if (!isLoaded || isGenerating || trip.status === TripStatus.GENERATING) return;

  //   async function calculateRoutes() {
  //     const newDirections: google.maps.DirectionsResult[] = [];
  //     const directionsService = new google.maps.DirectionsService();

  //     const validActivities = activities.filter(
  //       (activity): activity is Activity & { latitude: number; longitude: number } =>
  //         activity.latitude !== null && activity.longitude !== null
  //     );

  //     const points = accommodation ? [accommodation, ...validActivities] : validActivities;

  //     for (let i = 0; i < points.length - 1; i++) {
  //       const start = points[i];
  //       const end = points[i + 1];

  //       const origin: google.maps.LatLngLiteral = {
  //         lat: 'latitude' in start ? start.latitude : start.latitude,
  //         lng: 'longitude' in start ? start.longitude : start.longitude,
  //       };

  //       const destination: google.maps.LatLngLiteral = {
  //         lat: 'latitude' in end ? end.latitude : end.latitude,
  //         lng: 'longitude' in end ? end.longitude : end.longitude,
  //       };

  //       try {
  //         const result = await directionsService.route({
  //           origin,
  //           destination,
  //           travelMode: google.maps.TravelMode.DRIVING,
  //         });

  //         newDirections.push(result);
  //       } catch (error) {
  //         console.error('Direction service failed:', error);
  //       }
  //     }

  //     if (accommodation && activities.length > 0) {
  //       const lastActivity = activities[activities.length - 1];
  //       try {
  //         const result = await directionsService.route({
  //           origin: {
  //             lat: lastActivity.latitude!,
  //             lng: lastActivity.longitude!,
  //           },
  //           destination: {
  //             lat: accommodation.latitude,
  //             lng: accommodation.longitude,
  //           },
  //           travelMode: google.maps.TravelMode.DRIVING,
  //         });
  //         newDirections.push(result);
  //       } catch (error) {
  //         console.error('Failed to calculate return route:', error);
  //       }
  //     }

  //     setDirections(newDirections);
  //   }

  //   calculateRoutes();
  // }, [isLoaded, activities, accommodation, isGenerating, trip.status]);

  // Fit bounds when activities change
  React.useEffect(() => {
    if (!map || isGenerating || trip.status === TripStatus.GENERATING) return;

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
  }, [map, activities, accommodation, isGenerating, trip.status]);

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

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-destructive/10">
        <Card>
          <CardContent>
            <p className="text-destructive">Failed to load map. {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      <GoogleMap mapContainerClassName="w-full h-full" options={mapOptions} onLoad={setMap}>
        {/* Only show accommodation marker when not generating */}
        {!isGenerating && trip.status === TripStatus.COMPLETE && accommodation && (
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

        {/* Show activities when generation is complete */}
        {!isGenerating &&
          trip.status === TripStatus.COMPLETE &&
          activities.map((activity, index) => {
            const isHighlighted =
              hoveredActivityId === activity.id || selectedActivityId === activity.id;

            return (
              <Marker
                key={activity.id}
                position={{
                  lat: activity.latitude!,
                  lng: activity.longitude!,
                }}
                icon={getMarkerIcon(activity, isHighlighted)}
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
                zIndex={isHighlighted ? 1000 : 1}
              />
            );
          })}

        {/* Only show directions when generation is complete */}
        {/* {!isGenerating &&
          trip.status === TripStatus.COMPLETE &&
          directions.map((direction, index) => (
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
          ))} */}

        {/* Info Window */}
        {selectedMarker && !isGenerating && trip.status === TripStatus.COMPLETE && (
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
                <ActivityCategoryBadge category={selectedMarker.category} />
              </div>
              {selectedMarker.placeType && (
                <div className="text-xs text-muted-foreground mb-2">{selectedMarker.placeType}</div>
              )}
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
