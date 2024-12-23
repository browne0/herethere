import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { GoogleMap, InfoWindow, OVERLAY_MOUSE_TARGET, OverlayViewF } from '@react-google-maps/api';
import {
  Camera,
  MapPin,
  Loader2,
  type LucideIcon,
  Martini,
  Landmark,
  Star,
  HandPlatter,
  Palette,
  Flower2,
} from 'lucide-react';

import { useGoogleMapsStatus } from '@/components/maps/GoogleMapsProvider';
import { Card, CardContent } from '@/components/ui/card';
import { ActivityRecommendation } from '@/lib/types/recommendations';

import { type ParsedTrip } from '../../types';

interface RecommendationsMapViewProps {
  activities: ActivityRecommendation[];
  currentCategory: string;
  onMarkerHover: (activityId: string | null) => void;
  onMarkerSelect: (activityId: string | null) => void;
  hoveredActivityId: string | null;
  selectedActivityId: string | null;
  trip: ParsedTrip | null;
}

interface CustomMarkerProps {
  activity: ActivityRecommendation;
  isHighlighted: boolean;
  isInTrip: boolean;
  categoryType: string;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  labelPosition: 'left' | 'right';
}

// Activity type icons mapping
const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  'must-see': Star,
  restaurants: HandPlatter,
  'tourist-attractions': Camera,
  culture: Palette,
  'historic-sites': Landmark,
  nightlife: Martini,
  'spas-&-wellness': Flower2,
  // Default icon for any unmapped categories
  default: MapPin,
};

// Map styling to hide unnecessary elements
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
      featureType: 'road.highway',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
  ],
};

// Custom Marker Component
const CustomMarker = React.memo(
  ({
    activity,
    categoryType,
    isHighlighted,
    isInTrip,
    onClick,
    onMouseEnter,
    onMouseLeave,
    labelPosition,
  }: CustomMarkerProps) => {
    const IconComponent = ACTIVITY_ICONS[categoryType] || ACTIVITY_ICONS.default;

    return (
      <OverlayViewF
        position={{
          lat: activity.location.latitude,
          lng: activity.location.longitude,
        }}
        mapPaneName={OVERLAY_MOUSE_TARGET}
        getPixelPositionOffset={(width, height) => ({
          x: -(width / 2),
          y: -(height / 2),
        })}
      >
        <div className="relative">
          <button
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className={`group/marker relative block cursor-pointer rounded-full
            ${isHighlighted ? 'z-50' : 'hover:z-40 z-30'}`}
          >
            <div
              className={`flex h-7 min-w-7 items-center justify-center rounded-full 
              border transition-colors duration-300
              ${
                isInTrip
                  ? 'border-primary bg-primary text-background hover:bg-primary/90'
                  : isHighlighted
                    ? 'border-foreground/10 bg-foreground text-background'
                    : 'border-foreground/10 bg-background text-foreground hover:bg-foreground hover:text-background'
              }`}
            >
              <IconComponent className="w-5 h-5" />
            </div>
            {/* Only show label when highlighted */}
            {isHighlighted && (
              <div
                className={`pointer-events-none absolute w-40 text-xs font-medium leading-tight text-foreground
              ${labelPosition === 'right' ? 'left-full ml-1' : 'right-full mr-1'} 
              top-1/2 -translate-y-1/2 ${labelPosition === 'right' ? 'text-left' : 'text-right'}`}
              >
                <span className="rounded-sm bg-background/95 px-2 py-1 shadow-sm">
                  {activity.name}
                </span>
              </div>
            )}
          </button>
        </div>
      </OverlayViewF>
    );
  }
);

CustomMarker.displayName = 'CustomMarker';

const RecommendationsMapView: React.FC<RecommendationsMapViewProps> = ({
  activities,
  currentCategory,
  onMarkerHover,
  onMarkerSelect,
  hoveredActivityId,
  selectedActivityId,
  trip,
}) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityRecommendation | null>(null);
  const { isLoaded, loadError } = useGoogleMapsStatus();

  const boundsSet = useRef<boolean>(false);

  const fitBoundsToActivities = useCallback(() => {
    if (!map || !activities.length) return;

    const bounds = new google.maps.LatLngBounds();
    activities.forEach(activity => {
      const { location } = activity;
      bounds.extend({ lat: location.latitude, lng: location.longitude });
    });
    map.fitBounds(bounds, 100);
  }, [map, activities]);

  const handleMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    boundsSet.current = false;
  }, []);

  useEffect(() => {
    if (!map || boundsSet.current) return;

    if (activities.length === 0 && trip) {
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
      if (!center) return 'right';
      return lng > center.lng() ? 'left' : 'right';
    },
    [map]
  );

  const markers = useMemo(() => {
    return activities.map(activity => {
      const isInTrip = trip!.activities.some(
        tripActivity => tripActivity.recommendationId === activity.id
      );

      return (
        <CustomMarker
          key={activity.id}
          activity={activity}
          categoryType={currentCategory}
          isInTrip={isInTrip}
          isHighlighted={hoveredActivityId === activity.id || selectedActivityId === activity.id}
          onClick={() => {
            setSelectedActivity(activity);
            onMarkerSelect(activity.id);
          }}
          onMouseEnter={() => onMarkerHover(activity.id)}
          onMouseLeave={() => onMarkerHover(null)}
          labelPosition={getLabelPosition(activity.location.longitude)}
        />
      );
    });
  }, [
    activities,
    currentCategory,
    hoveredActivityId,
    selectedActivityId,
    getLabelPosition,
    onMarkerSelect,
    onMarkerHover,
    trip,
  ]);

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
    <GoogleMap
      mapContainerClassName="w-full h-full relative"
      options={mapOptions}
      onLoad={handleMapLoad}
    >
      {markers}

      {selectedActivity && (
        <InfoWindow
          position={{
            lat: selectedActivity.location.latitude,
            lng: selectedActivity.location.longitude,
          }}
          onCloseClick={() => {
            setSelectedActivity(null);
            onMarkerSelect(null);
          }}
        >
          <div className="p-2 max-w-xs">
            <h3 className="font-medium mb-2">{selectedActivity.name}</h3>
            <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{selectedActivity.location.address}</span>
            </div>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};

export default RecommendationsMapView;
