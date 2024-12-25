import React, { useCallback, useEffect, useRef, useState } from 'react';

import { GoogleMap, InfoWindow } from '@react-google-maps/api';
import { MapPin, Loader2 } from 'lucide-react';

import { useGoogleMapsStatus } from '@/components/maps/GoogleMapsProvider';
import { Card, CardContent } from '@/components/ui/card';
import { ActivityRecommendation } from '@/lib/types/recommendations';

import { type ParsedTrip } from '../../types';
import CustomMarker from './CustomMarker';
import { MapLegend } from './MapLegend';

interface RecommendationsMapViewProps {
  activities: ActivityRecommendation[];
  currentCategory: string;
  onMarkerHover: (activityId: string | null) => void;
  onMarkerSelect: (activityId: string | null) => void;
  hoveredActivityId: string | null;
  selectedActivityId: string | null;
  trip: ParsedTrip | null;
}

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
  const [isMobile, setIsMobile] = useState(false);

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

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Check initially
    checkMobile();

    // Add resize listener
    window.addEventListener('resize', checkMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getLabelPosition = useCallback(
    (lng: number): 'left' | 'right' => {
      if (!map) return 'right';
      const center = map.getCenter();
      if (!center) return 'right';
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

  const markers = activities.map(activity => {
    const tripActivity = trip!.activities.find(
      tripActivity => tripActivity.recommendationId === activity.id
    );
    const isInTrip = !!tripActivity;
    const tripStatus = tripActivity?.status as 'planned' | 'interested' | undefined;

    return (
      <CustomMarker
        key={activity.id}
        activity={activity}
        categoryType={currentCategory}
        isInTrip={isInTrip}
        tripStatus={tripStatus}
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

  // Map styling to hide unnecessary elements
  const mapOptions: google.maps.MapOptions = {
    disableDefaultUI: isMobile,
    clickableIcons: false,
    streetViewControl: false,
    mapTypeControl: false,
    keyboardShortcuts: false,
    fullscreenControl: false,
    zoomControlOptions: {
      position: google.maps.ControlPosition.TOP_RIGHT,
    },
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

  return (
    <GoogleMap
      mapContainerClassName="w-full h-full overflow-hidden"
      options={mapOptions}
      onLoad={handleMapLoad}
    >
      <MapLegend />
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
