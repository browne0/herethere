import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { GoogleMap, InfoWindow } from '@react-google-maps/api';
import { Calendar, Loader2, MapPin } from 'lucide-react';

import { useGoogleMapsStatus } from '@/components/maps/GoogleMapsProvider';
import { Card, CardContent } from '@/components/ui/card';
import { useActivitiesStore } from '@/lib/stores/activitiesStore';
import { ActivityRecommendation } from '@/lib/types/recommendations';

import CustomMarker from '../../components/RecommendationsView/CustomMarker';
import { MapLegend } from '../../components/RecommendationsView/MapLegend';
import { ParsedTrip } from '../../types';

// Constants for map display
const MIN_LABEL_DISTANCE = 105;
const DEFAULT_ZOOM = 13;
const MIN_ZOOM_FOR_LABELS = 12;

interface ItineraryMapProps {
  initialTrip: ParsedTrip;
  onMarkerHover: (activityId: string | null) => void;
  onMarkerSelect: (activityId: string | null) => void;
  hoveredActivityId: string | null;
  selectedActivityId: string | null;
  currentDayIndex?: number; // Optional - if provided, highlights current day's activities
}

interface MarkerWithPixels {
  id: string;
  position: google.maps.LatLng;
  label?: string;
  pixel?: google.maps.Point;
  shouldShowLabel: boolean;
}

interface DayActivities {
  dayIndex: number;
  date: Date;
  timezone: string;
  activities: Array<{
    activityId: string;
    activity: ActivityRecommendation;
    status: 'planned' | 'interested';
    startTime: Date;
  }>;
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

  // Track occupied spaces
  const occupiedSpaces: Array<{ x: number; y: number }> = [];
  const visibleLabels = new Set<string>();

  // Check each marker for available space
  markersWithPixels.forEach(marker => {
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

const ItineraryMap: React.FC<ItineraryMapProps> = ({
  onMarkerHover,
  onMarkerSelect,
  hoveredActivityId,
  initialTrip,
}) => {
  const { trip } = useActivitiesStore();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [selectedActivity, setSelectedActivity] = useState<ActivityRecommendation | null>(null);
  const [visibleLabels, setVisibleLabels] = useState<Set<string>>(new Set());
  const { isLoaded, loadError } = useGoogleMapsStatus();
  const boundsSet = useRef<boolean>(false);

  // Organize activities by day
  const activitiesByDay = useMemo((): DayActivities[] => {
    if (!trip) return [];

    const days: DayActivities[] = [];
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);
    const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i <= dayCount; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);

      const dayActivities = trip.activities.filter(activity => {
        const activityDate = new Date(activity.startTime!);
        return activityDate.toDateString() === currentDate.toDateString();
      });

      days.push({
        dayIndex: i,
        date: currentDate,
        timezone: trip.city.timezone,
        activities: dayActivities.map(ta => ({
          activityId: ta.id,
          activity: ta.recommendation,
          status: ta.status as 'planned' | 'interested',
          startTime: new Date(ta.startTime!),
        })),
      });
    }

    return days;
  }, [trip]);

  // Calculate marker visibility based on zoom level
  const handleMapChange = useCallback(() => {
    if (!map || !trip) return;

    const newZoom = map.getZoom() || DEFAULT_ZOOM;
    setZoom(newZoom);

    const markers = trip.activities.map(ta => ({
      id: ta.recommendationId,
      position: new google.maps.LatLng(
        ta.recommendation.location.latitude,
        ta.recommendation.location.longitude
      ),
      label: ta.recommendation.name,
      shouldShowLabel: false,
    }));

    const visibleLabels = calculateVisibleLabels(markers, map, newZoom);
    setVisibleLabels(visibleLabels);
  }, [map, trip]);

  // Map initialization and bounds setting
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
    if (!map || boundsSet.current || !trip) return;

    // Center on city coordinates by default
    map.setCenter({
      lat: initialTrip.city.latitude,
      lng: initialTrip.city.longitude,
    });
    map.setZoom(DEFAULT_ZOOM);
    // Adjust bounds if there are activities
    if (trip.activities.length > 0) {
      const bounds = new google.maps.LatLngBounds();

      trip.activities.forEach(activity => {
        bounds.extend({
          lat: activity.recommendation.location.latitude,
          lng: activity.recommendation.location.longitude,
        });
      });
      map.fitBounds(bounds, 100);
    }

    boundsSet.current = true;
  }, [initialTrip.city.latitude, initialTrip.city.longitude, map, trip, trip?.activities]);

  // Loading and error states
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

  // Map configuration
  const mapOptions: google.maps.MapOptions = {
    disableDefaultUI: true,
    clickableIcons: false,
    streetViewControl: false,
    mapTypeControl: false,
    keyboardShortcuts: false,
    fullscreenControl: false,
    zoomControl: false,
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
    ],
  };

  // Render markers for each day's activities
  const renderDayMarkers = (day: DayActivities) => {
    return day.activities.map(({ activityId, activity, status }) => {
      const isHighlighted = hoveredActivityId === activityId;

      return (
        <CustomMarker
          key={activity.id}
          activity={activity}
          isInTrip={true}
          tripStatus={status}
          isHighlighted={isHighlighted}
          hoveredActivityId={hoveredActivityId}
          onClick={() => {
            setSelectedActivity(activity);
            onMarkerSelect(activity.id);
          }}
          onMouseEnter={() => onMarkerHover(activity.id)}
          onMouseLeave={() => onMarkerHover(null)}
          labelPosition="right"
        />
      );
    });
  };

  return (
    <GoogleMap
      mapContainerClassName="w-full h-full overflow-hidden"
      options={mapOptions}
      onLoad={handleMapLoad}
      zoom={zoom}
    >
      <MapLegend />
      {activitiesByDay.map(day => renderDayMarkers(day))}

      {selectedActivity && (
        <InfoWindow
          position={{
            lat: selectedActivity.location.latitude,
            lng: selectedActivity.location.longitude,
          }}
          onCloseClick={() => {
            setSelectedActivity(null);
            onMarkerSelect?.(null);
          }}
        >
          <div className="p-2 max-w-xs">
            <h3 className="font-medium mb-2">{selectedActivity.name}</h3>
            <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                Day{' '}
                {(activitiesByDay.find(day =>
                  day.activities.some(a => a.activity.id === selectedActivity.id)
                )?.dayIndex ?? -1) + 1}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{selectedActivity.location.address}</span>
            </div>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};

export default ItineraryMap;
