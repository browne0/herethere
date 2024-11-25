'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { GoogleMap, InfoWindow, OVERLAY_MOUSE_TARGET, OverlayView } from '@react-google-maps/api';
import { format } from 'date-fns';
import {
  Camera,
  Music,
  ShoppingBag,
  Umbrella,
  TreePine,
  PartyPopper,
  Heart,
  Utensils,
  Building2,
  MapPin,
  Clock,
  type LucideIcon,
  Loader2,
} from 'lucide-react';

import { useGoogleMapsStatus } from '@/components/maps/GoogleMapsProvider';
import { Card, CardContent } from '@/components/ui/card';

import type { ParsedItineraryActivity, ParsedTrip } from '../../types';

interface TripMapViewProps {
  activities: ParsedItineraryActivity[];
  onMarkerHover: (activityId: string | null) => void;
  onMarkerSelect: (activityId: string | null) => void;
  hoveredActivityId: string | null;
  selectedActivityId: string | null;
  trip: ParsedTrip;
}

const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  beaches: Umbrella,
  sightseeing: Building2,
  outdoor: TreePine,
  events: PartyPopper,
  food: Utensils,
  nightlife: Music,
  shopping: ShoppingBag,
  wellness: Heart,
  default: Camera,
};

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
    {
      featureType: 'transit',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
    {
      featureType: 'transit.line',
      elementType: 'geometry',
      stylers: [{ visibility: 'off' }],
    },
    {
      featureType: 'transit.station',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
    {
      featureType: 'transit.station.rail',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
    {
      featureType: 'road.highway',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
    {
      featureType: 'road.arterial',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
    {
      featureType: 'road',
      elementType: 'labels.icon',
      stylers: [{ visibility: 'off' }],
    },
  ],
};

interface CustomMarkerProps {
  activity: ParsedItineraryActivity;
  isHighlighted: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  labelPosition: 'left' | 'right';
}

function CustomMarker({
  activity,
  isHighlighted,
  onClick,
  onMouseEnter,
  onMouseLeave,
  labelPosition,
}: CustomMarkerProps) {
  const { recommendation } = activity;
  const IconComponent =
    /*ACTIVITY_ICONS[recommendation.category.toLowerCase()] || */ ACTIVITY_ICONS.default;

  return (
    <OverlayView
      position={{
        lat: recommendation.location!.latitude,
        lng: recommendation.location!.longitude,
      }}
      mapPaneName={OVERLAY_MOUSE_TARGET}
    >
      <div className="relative">
        <button
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          className={`group/marker relative block cursor-pointer rounded-full transform -translate-x-1/2 -translate-y-1/2
            ${isHighlighted ? 'z-50' : 'hover:z-40 z-30'}`}
        >
          <div
            className={`flex h-7 min-w-[1.75rem] items-center justify-center rounded-full 
            border border-foreground/10 px-1.5 shadow-[0_2px_4px_rgba(0,0,0,.18)] 
            transition-colors duration-300
            ${isHighlighted ? 'bg-foreground text-background' : 'bg-background text-foreground hover:bg-foreground hover:text-background'}`}
          >
            <IconComponent size={19} strokeWidth={1.5} />
            {activity.status === 'confirmed' && (
              <div className="ml-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 text-white">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="7"
                  height="7"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m3.643 13.993 3.51 4.513a1.285 1.285 0 0 0 2.006.038L20.357 4.993" />
                </svg>
              </div>
            )}
          </div>
          <div
            className={`pointer-events-none absolute w-[10em] text-2xs font-medium leading-[1.17] text-foreground
            ${labelPosition === 'right' ? 'left-[calc(100%+4px)]' : 'right-[calc(100%+4px)]'} 
            top-1/2 -translate-y-1/2 ${labelPosition === 'right' ? 'text-left' : 'text-right'}`}
          >
            <span className="rounded-sm bg-background/95 box-decoration-clone px-1">
              {recommendation.name}
            </span>
          </div>
        </button>
      </div>
    </OverlayView>
  );
}

export function TripMapView({
  activities,
  onMarkerHover,
  onMarkerSelect,
  hoveredActivityId,
  selectedActivityId,
  trip,
}: TripMapViewProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ParsedItineraryActivity | null>(null);
  const { isLoaded, loadError } = useGoogleMapsStatus();
  const boundsSet = useRef(false);

  const fitBoundsToActivities = useCallback(() => {
    if (!map || !activities.length) return;

    const bounds = new google.maps.LatLngBounds();
    activities.forEach(activity => {
      const { location } = activity.recommendation;
      bounds.extend({ lat: location.latitude, lng: location.longitude });
    });
    map.fitBounds(bounds, 100);
  }, [map, activities]);

  const handleMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    boundsSet.current = false; // Reset bounds flag on map load
  }, []);

  // Only fit bounds when activities change or on initial load
  useEffect(() => {
    if (!map || boundsSet.current) return;

    if (activities.length === 0) {
      map.setCenter({ lat: trip.city.latitude, lng: trip.city.longitude });
      map.setZoom(13);
    } else {
      fitBoundsToActivities();
    }
    boundsSet.current = true;
  }, [map, activities, trip, fitBoundsToActivities]);

  const getLabelPosition = useCallback(
    (lng: number): 'left' | 'right' => {
      if (!map) return 'right';
      const center = map.getCenter();
      if (!center) return 'left';
      return lng > center.lng() ? 'left' : 'right';
    },
    [map]
  );

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
            <p className="text-destructive">Failed to load map</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      <GoogleMap mapContainerClassName="w-full h-full" options={mapOptions} onLoad={handleMapLoad}>
        {activities.map(activity => (
          <CustomMarker
            key={activity.id}
            activity={activity}
            isHighlighted={hoveredActivityId === activity.id || selectedActivityId === activity.id}
            onClick={() => {
              setSelectedActivity(activity);
              onMarkerSelect(activity.id);
            }}
            onMouseEnter={() => onMarkerHover(activity.id)}
            onMouseLeave={() => onMarkerHover(null)}
            labelPosition={getLabelPosition(activity.recommendation.location.longitude)}
          />
        ))}

        {selectedActivity && (
          <InfoWindow
            position={{
              lat: selectedActivity.recommendation.location.latitude,
              lng: selectedActivity.recommendation.location.longitude,
            }}
            onCloseClick={() => {
              setSelectedActivity(null);
              onMarkerSelect(null);
            }}
          >
            <div className="p-2 max-w-xs">
              <h3 className="font-medium mb-2">{selectedActivity.recommendation.name}</h3>
              <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{selectedActivity.recommendation.location.address}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {format(new Date(selectedActivity.startTime), 'h:mm a')} -{' '}
                  {format(new Date(selectedActivity.endTime), 'h:mm a')}
                </span>
              </div>
              {selectedActivity.notes && (
                <p className="mt-2 text-sm border-t pt-2">{selectedActivity.notes}</p>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
