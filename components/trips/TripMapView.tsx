import React from 'react';

import { Activity } from '@prisma/client';
import {
  GoogleMap,
  Marker,
  InfoWindow,
  Libraries,
  OverlayView,
  OVERLAY_MOUSE_TARGET,
} from '@react-google-maps/api';
import { format } from 'date-fns';
import {
  Clock,
  MapPin,
  Loader2,
  Camera,
  Music,
  ShoppingBag,
  LucideIcon,
  Umbrella,
  TreePine,
  PartyPopper,
  Heart,
  Utensils,
  Building2,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { useTripActivities } from '@/contexts/TripActivitiesContext';
import { ActivityCategory } from '@/lib/types/activities';

import { useGoogleMapsStatus } from '../maps/GoogleMapsProvider';

interface CustomMarkerProps {
  activity: Activity;
  isHighlighted: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  labelPosition?: 'left' | 'right';
}

interface TripMapViewProps {
  onMarkerHover: (activityId: string | null) => void;
  onMarkerSelect: (activityId: string | null) => void;
  hoveredActivityId: string | null;
  selectedActivityId: string | null;
  accommodation?: {
    latitude: number;
    longitude: number;
  };
}

interface Position {
  lat: number;
  lng: number;
}

const ACTIVITY_ICONS: Record<ActivityCategory, LucideIcon> = {
  BEACHES: Umbrella,
  CITY_SIGHTSEEING: Building2,
  OUTDOOR_ADVENTURES: TreePine,
  FESTIVALS_EVENTS: PartyPopper,
  FOOD_EXPLORATION: Utensils,
  NIGHTLIFE: Music,
  SHOPPING: ShoppingBag,
  SPA_WELLNESS: Heart,
};

const CustomMarker: React.FC<CustomMarkerProps> = ({
  activity,
  isHighlighted,
  onClick,
  onMouseEnter,
  onMouseLeave,
  labelPosition = 'right',
}) => {
  const IconComponent =
    ACTIVITY_ICONS[activity.category.toUpperCase() as ActivityCategory] || Camera;

  return (
    <OverlayView
      position={{ lat: activity.latitude!, lng: activity.longitude! }}
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
          </div>
          <div
            className={`pointer-events-none absolute w-[10em] text-2xs font-medium leading-[1.17] text-foreground
            ${labelPosition === 'right' ? 'left-[calc(100%+4px)]' : 'right-[calc(100%+4px)]'} 
            top-1/2 -translate-y-1/2 ${labelPosition === 'right' ? 'text-left' : 'text-right'}`}
          >
            <span className="rounded-sm bg-background/95 box-decoration-clone px-1">
              {activity.name}
            </span>
          </div>
        </button>
      </div>
    </OverlayView>
  );
};

const libraries: Libraries = ['places', 'marker'];

export const TripMapView: React.FC<TripMapViewProps> = ({
  onMarkerHover,
  onMarkerSelect,
  hoveredActivityId,
  selectedActivityId,
  accommodation,
}) => {
  const { activities, trip, isGenerating, error } = useTripActivities();
  const [selectedMarker, setSelectedMarker] = React.useState<Activity | null>(null);
  const [map, setMap] = React.useState<google.maps.Map | null>(null);

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

  const { isLoaded, loadError } = useGoogleMapsStatus();

  React.useEffect(() => {
    if (!map || isGenerating || trip.status === 'GENERATING') return;

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

  const getMarkerLabelPosition = (position: Position, mapCenter: google.maps.LatLng | null) => {
    if (!mapCenter) return 'right';
    return position.lng > mapCenter.lng() ? 'left' : 'right';
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

  if (loadError || error) {
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
      <GoogleMap mapContainerClassName="w-full h-full" options={mapOptions} onLoad={setMap}>
        {!isGenerating && trip.status === 'COMPLETE' && (
          <>
            {accommodation && (
              <Marker
                position={{
                  lat: accommodation.latitude,
                  lng: accommodation.longitude,
                }}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  fillColor: '#22c55e',
                  fillOpacity: 1,
                  strokeWeight: 2,
                  strokeColor: '#FFFFFF',
                  scale: 10,
                }}
              />
            )}

            {activities.map(activity => {
              const isHighlighted =
                hoveredActivityId === activity.id || selectedActivityId === activity.id;
              const position = {
                lat: activity.latitude!,
                lng: activity.longitude!,
              };

              return (
                <CustomMarker
                  key={activity.id}
                  activity={activity}
                  isHighlighted={isHighlighted}
                  onClick={() => {
                    setSelectedMarker(activity);
                    onMarkerSelect(activity.id);
                  }}
                  onMouseEnter={() => onMarkerHover(activity.id)}
                  onMouseLeave={() => onMarkerHover(null)}
                  labelPosition={getMarkerLabelPosition(position, map?.getCenter() ?? null)}
                />
              );
            })}

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
                  <h3 className="font-medium mb-2">{selectedMarker.name}</h3>
                  {selectedMarker.placeType && (
                    <div className="text-xs text-muted-foreground mb-2">
                      {selectedMarker.placeType}
                    </div>
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
                      {format(new Date(selectedMarker.startTime), 'h:mm a')} -{' '}
                      {format(new Date(selectedMarker.endTime), 'h:mm a')}
                    </span>
                  </div>
                  {selectedMarker.notes && (
                    <p className="mt-2 text-sm border-t pt-2">{selectedMarker.notes}</p>
                  )}
                </div>
              </InfoWindow>
            )}
          </>
        )}
      </GoogleMap>
    </div>
  );
};

export default TripMapView;
