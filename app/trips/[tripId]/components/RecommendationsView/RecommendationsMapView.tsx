import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  GoogleMap,
  InfoWindow,
  MarkerF,
  OVERLAY_MOUSE_TARGET,
  OverlayViewF,
} from '@react-google-maps/api';
import { Loader2, MapPin } from 'lucide-react';

import { useGoogleMapsStatus } from '@/components/maps/GoogleMapsProvider';
import { Card, CardContent } from '@/components/ui/card';
import { useActivitiesStore } from '@/lib/stores/activitiesStore';
import { ActivityRecommendation } from '@/lib/types/recommendations';

import { cn } from '@/lib/utils';
import { type ParsedTrip } from '../../types';
import CustomMarker from './CustomMarker';
import { MapLegend } from './MapLegend';

// Constants
const MIN_LABEL_DISTANCE = 105;
const DEFAULT_ZOOM = 14;
const MIN_ZOOM_FOR_LABELS = 12;

// Types
interface MarkerWithPixels {
  id: string;
  position: google.maps.LatLng;
  label?: string;
  pixel?: google.maps.Point;
  shouldShowLabel: boolean;
  priority: number;
}

interface RecommendationsMapViewProps {
  activities: ActivityRecommendation[];
  currentCategory: string;
  onMarkerHover: (activityId: string | null) => void;
  onMarkerSelect: (activityId: string | null) => void;
  hoveredActivityId: string | null;
  selectedActivityId: string | null;
  trip: ParsedTrip | null;
}

const calculateVisibleLabels = (
  markers: MarkerWithPixels[],
  map: google.maps.Map | null,
  zoom: number
): Set<string> => {
  if (!map || zoom < MIN_ZOOM_FOR_LABELS) return new Set();

  const projection = map.getProjection();
  if (!projection) return new Set();

  // Convert all markers to pixel coordinates
  const markersWithPixels = markers.map(marker => {
    const pixel = projection.fromLatLngToPoint(marker.position);
    const scaledPixel = new google.maps.Point(
      pixel!.x * Math.pow(2, zoom),
      pixel!.y * Math.pow(2, zoom)
    );
    return { ...marker, pixel: scaledPixel };
  });

  // Sort by priority (higher rating = higher priority)
  const sortedMarkers = [...markersWithPixels].sort((a, b) => b.priority - a.priority);

  // Track occupied spaces
  const occupiedSpaces: Array<{ x: number; y: number }> = [];
  const visibleLabels = new Set<string>();

  // Check each marker for available space
  sortedMarkers.forEach(marker => {
    if (!marker.pixel) return;

    const hasSpace = !occupiedSpaces.some(space => {
      const distance = Math.sqrt(
        Math.pow(space.x - marker.pixel!.x, 2) + Math.pow(space.y - marker.pixel!.y, 2)
      );
      return distance < MIN_LABEL_DISTANCE;
    });

    if (hasSpace) {
      occupiedSpaces.push({
        x: marker.pixel.x,
        y: marker.pixel.y,
      });
      visibleLabels.add(marker.id);
    }
  });

  return visibleLabels;
};

const RecommendationsMapView: React.FC<RecommendationsMapViewProps> = ({
  currentCategory,
  onMarkerHover,
  onMarkerSelect,
  hoveredActivityId,
  selectedActivityId,
}) => {
  const { trip, categories } = useActivitiesStore();

  const activities = useMemo(() => {
    const currentCategoryData = categories.find(c => c.type === currentCategory);
    return currentCategoryData?.activities || [];
  }, [categories, currentCategory]);

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [selectedActivity, setSelectedActivity] = useState<ActivityRecommendation | null>(null);
  const [visibleLabels, setVisibleLabels] = useState<Set<string>>(new Set());
  const { isLoaded, loadError } = useGoogleMapsStatus();
  const boundsSet = useRef<boolean>(false);

  const handleMapChange = useCallback(() => {
    if (!map) return;

    const newZoom = map.getZoom() || DEFAULT_ZOOM;
    setZoom(newZoom);

    const markers = activities.map(activity => {
      const tripActivity = trip?.activities.find(ta => ta.recommendationId === activity.id);
      const isInTrip = !!tripActivity;

      return {
        id: activity.id,
        position: new google.maps.LatLng(activity.location.latitude, activity.location.longitude),
        label: activity.name,
        shouldShowLabel: false,
        priority: isInTrip ? 1000 : (activity.rating || 0) * 100, // Prioritize trip items
      };
    });

    const newVisibleLabels = calculateVisibleLabels(markers, map, newZoom);
    setVisibleLabels(newVisibleLabels);
  }, [map, activities, trip]);

  const handleMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    boundsSet.current = false;
  }, []);

  useEffect(() => {
    if (map) {
      map.addListener('zoom_changed', handleMapChange);
      map.addListener('bounds_changed', handleMapChange);
      return () => {
        google.maps.event.clearListeners(map, 'zoom_changed');
        google.maps.event.clearListeners(map, 'bounds_changed');
      };
    }
  }, [map, handleMapChange]);

  useEffect(() => {
    if (!map || boundsSet.current) return;

    if (activities.length === 0 && trip) {
      map.setCenter({
        lat: trip.city.latitude,
        lng: trip.city.longitude,
      });
      map.setZoom(DEFAULT_ZOOM);
    } else if (activities.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      activities.forEach(activity => {
        bounds.extend({
          lat: activity.location.latitude,
          lng: activity.location.longitude,
        });
      });
      map.fitBounds(bounds, 100);
    }
    boundsSet.current = true;
  }, [map, activities, trip]);

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

  const mapOptions: google.maps.MapOptions = {
    disableDefaultUI: true,
    clickableIcons: false,
    streetViewControl: false,
    mapTypeControl: false,
    keyboardShortcuts: false,
    fullscreenControl: false,
    zoomControl: false,
    zoomControlOptions: {
      position: google.maps.ControlPosition.TOP_RIGHT,
    },
    gestureHandling: 'greedy',
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

  const renderMarkers = activities.map(activity => {
    const tripActivity = trip?.activities.find(ta => ta.recommendationId === activity.id);
    const isInTrip = !!tripActivity;
    const isHighlighted = hoveredActivityId === activity.id;

    if (isInTrip) {
      return (
        <CustomMarker
          key={activity.id}
          activity={activity}
          isInTrip={true}
          tripStatus={tripActivity?.status as 'planned' | 'interested'}
          isHighlighted={isHighlighted}
          onClick={() => {
            setSelectedActivity(activity);
            onMarkerSelect(activity.id);
          }}
          onMouseEnter={() => onMarkerHover(activity.id)}
          onMouseLeave={() => onMarkerHover(null)}
          labelPosition="right"
          hoveredActivityId={hoveredActivityId}
        />
      );
    }

    // For non-trip activities, render a regular marker with OverlayViewF label
    return (
      <React.Fragment key={activity.id}>
        <MarkerF
          position={{
            lat: activity.location.latitude,
            lng: activity.location.longitude,
          }}
          onClick={() => {
            setSelectedActivity(activity);
            onMarkerSelect(activity.id);
          }}
          opacity={hoveredActivityId ? (hoveredActivityId === activity.id ? 1 : 0.5) : 1}
          animation={hoveredActivityId === activity.id ? google.maps.Animation.BOUNCE : undefined}
        />
        {isHighlighted && (
          <OverlayViewF
            position={{
              lat: activity.location.latitude,
              lng: activity.location.longitude,
            }}
            mapPaneName={OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={() => ({
              x: 20, // Offset to position label to the right of marker
              y: -25,
            })}
          >
            <div className="pointer-events-none absolute max-w-[160px] text-xs font-medium leading-tight text-foreground whitespace-nowrap">
              <span
                className={cn('rounded-sm bg-background/95 px-2 py-1 shadow-sm', {
                  'border-2 border-black': isHighlighted,
                })}
              >
                {activity.name}
              </span>
            </div>
          </OverlayViewF>
        )}
      </React.Fragment>
    );
  });

  return (
    <GoogleMap
      mapContainerClassName="w-full h-full overflow-hidden"
      options={mapOptions}
      onLoad={handleMapLoad}
      zoom={zoom}
    >
      <MapLegend />
      {renderMarkers}
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
