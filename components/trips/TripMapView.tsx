import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Activity } from '@prisma/client';
import {
  GoogleMap,
  Marker,
  InfoWindow,
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
  labelPosition?: LabelPosition;
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

interface Cluster {
  center: google.maps.LatLng;
  markers: Array<{
    activity: Activity;
    position: google.maps.LatLng;
  }>;
}

const CLUSTER_RADIUS = 100; // pixels

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

type LabelPosition = 'right' | 'left' | 'right-up' | 'right-down' | 'left-up' | 'left-down';

const getLabelPosition = (
  currentMarker: Position,
  otherMarkers: Position[],
  mapCenter: google.maps.LatLng | null,
  map: google.maps.Map | null
): LabelPosition => {
  if (!map) return 'right';

  // Initial position based on map center
  const basePosition = currentMarker.lng > (mapCenter?.lng() ?? 0) ? 'left' : 'right';

  // Convert all markers to pixel coordinates
  const projection = map.getProjection();
  if (!projection) return basePosition;

  const currentPixel = projection.fromLatLngToPoint(
    new google.maps.LatLng(currentMarker.lat, currentMarker.lng)
  );

  // Check for overlaps
  const nearbyMarkers = otherMarkers.filter(marker => {
    const markerPixel = projection.fromLatLngToPoint(
      new google.maps.LatLng(marker.lat, marker.lng)
    );

    const pixelDistance = Math.sqrt(
      Math.pow((currentPixel!.x - markerPixel!.x) * Math.pow(2, map.getZoom() || 0), 2) +
        Math.pow((currentPixel!.y - markerPixel!.y) * Math.pow(2, map.getZoom() || 0), 2)
    );

    return pixelDistance < 100; // Adjust this threshold as needed
  });

  if (nearbyMarkers.length === 0) return basePosition;

  // Try positions in order of preference
  const positions: LabelPosition[] = [
    basePosition,
    `${basePosition}-up` as LabelPosition,
    `${basePosition}-down` as LabelPosition,
  ];

  return positions[Math.min(nearbyMarkers.length - 1, positions.length - 1)];
};

const getPositionClasses = (position: LabelPosition) => {
  const baseClasses = {
    right: 'left-[calc(100%+4px)] -translate-y-1/2 text-left',
    left: 'right-[calc(100%+4px)] -translate-y-1/2 text-right',
    'right-up': 'left-[calc(100%+4px)] -translate-y-full -mt-2 text-left',
    'right-down': 'left-[calc(100%+4px)] mt-2 text-left',
    'left-up': 'right-[calc(100%+4px)] -translate-y-full -mt-2 text-right',
    'left-down': 'right-[calc(100%+4px)] mt-2 text-right',
  };

  return baseClasses[position] || baseClasses.right;
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
    ${getPositionClasses(labelPosition)}`}
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

export const TripMapView: React.FC<TripMapViewProps> = ({
  onMarkerHover,
  onMarkerSelect,
  hoveredActivityId,
  selectedActivityId,
  accommodation,
}) => {
  const { activities, error } = useTripActivities();
  const [selectedMarker, setSelectedMarker] = useState<Activity | null>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const previousActivitiesLength = useRef(0);

  const confirmedActivities = useMemo(
    () =>
      activities.filter(
        activity =>
          !activity.isProcessing && !activity.error && activity.latitude && activity.longitude
      ),
    [activities]
  );

  // Create clusters based on pixel distance
  const updateClusters = useCallback(() => {
    if (!map || !confirmedActivities.length) return;

    const projection = map.getProjection();
    if (!projection) return;

    const pixelPositions = new Map<Activity, { x: number; y: number }>();
    const processed = new Set<Activity>();

    // First pass: convert all positions to pixels
    confirmedActivities.forEach(activity => {
      try {
        const position = new google.maps.LatLng(activity.latitude!, activity.longitude!);
        const point = projection.fromLatLngToPoint(position);
        if (!point) return;

        const scale = Math.pow(2, map.getZoom() || 0);
        const pixel = {
          x: point.x * scale,
          y: point.y * scale,
        };
        pixelPositions.set(activity, pixel);
      } catch (e) {
        console.error('Failed to convert position to pixel:', e);
      }
    });

    // Second pass: create initial clusters
    const tempClusters: Map<Activity, Cluster> = new Map();

    confirmedActivities.forEach(activity => {
      if (processed.has(activity)) return;

      const pixel = pixelPositions.get(activity);
      if (!pixel) return;

      const position = new google.maps.LatLng(activity.latitude!, activity.longitude!);
      let foundCluster = false;

      // Check against existing clusters first
      for (const [rootActivity, cluster] of tempClusters) {
        const rootPixel = pixelPositions.get(rootActivity);
        if (!rootPixel) continue;

        const distance = Math.sqrt(
          Math.pow(pixel.x - rootPixel.x, 2) + Math.pow(pixel.y - rootPixel.y, 2)
        );

        if (distance <= CLUSTER_RADIUS) {
          cluster.markers.push({
            activity,
            position: new google.maps.LatLng(activity.latitude!, activity.longitude!),
          });
          processed.add(activity);
          foundCluster = true;
          break;
        }
      }

      // If no nearby cluster found, create new one
      if (!foundCluster) {
        const newCluster: Cluster = {
          center: position,
          markers: [
            {
              activity,
              position,
            },
          ],
        };
        tempClusters.set(activity, newCluster);
        processed.add(activity);
      }
    });

    // Third pass: merge close clusters
    const clusterArray = Array.from(tempClusters.values());
    const finalClusters: Cluster[] = [];
    const processedClusters = new Set<Cluster>();

    clusterArray.forEach(cluster1 => {
      if (processedClusters.has(cluster1)) return;

      const mergedCluster: Cluster = {
        center: cluster1.center,
        markers: [...cluster1.markers],
      };

      clusterArray.forEach(cluster2 => {
        if (cluster1 === cluster2 || processedClusters.has(cluster2)) return;

        const point1 = projection.fromLatLngToPoint(cluster1.center)!;
        const point2 = projection.fromLatLngToPoint(cluster2.center)!;
        const scale = Math.pow(2, map.getZoom() || 0);

        const distance = Math.sqrt(
          Math.pow((point1.x - point2.x) * scale, 2) + Math.pow((point1.y - point2.y) * scale, 2)
        );

        if (distance <= CLUSTER_RADIUS) {
          mergedCluster.markers.push(...cluster2.markers);
          processedClusters.add(cluster2);
        }
      });

      // Recalculate center for merged cluster
      if (mergedCluster.markers.length > 1) {
        const bounds = new google.maps.LatLngBounds();
        mergedCluster.markers.forEach(({ position }) => bounds.extend(position));
        mergedCluster.center = bounds.getCenter();
      }

      finalClusters.push(mergedCluster);
      processedClusters.add(cluster1);
    });

    setClusters(finalClusters);
  }, [map, confirmedActivities]);

  // Update clusters when map changes or activities are added/removed
  useEffect(() => {
    if (!map) return;

    const listeners = [
      map.addListener('zoom_changed', updateClusters),
      map.addListener('bounds_changed', updateClusters),
    ];

    // Initial cluster update
    updateClusters();

    // Update bounds for new activities
    if (confirmedActivities.length !== previousActivitiesLength.current) {
      const bounds = new google.maps.LatLngBounds();

      if (accommodation) {
        bounds.extend({ lat: accommodation.latitude, lng: accommodation.longitude });
      }

      confirmedActivities.forEach(activity => {
        if (activity.latitude && activity.longitude) {
          bounds.extend({ lat: activity.latitude, lng: activity.longitude });
        }
      });

      map.fitBounds(bounds, 50);
      previousActivitiesLength.current = confirmedActivities.length;
    }

    return () => {
      listeners.forEach(listener => google.maps.event.removeListener(listener));
    };
  }, [map, updateClusters, confirmedActivities, accommodation]);

  const handleClusterClick = (cluster: Cluster) => {
    if (!map || cluster.markers.length < 3) return;

    // Create bounds for the cluster
    const bounds = new google.maps.LatLngBounds();
    cluster.markers.forEach(({ position }) => bounds.extend(position));

    // First pan to center of cluster
    map.panTo(cluster.center);

    // Then fit bounds with padding
    map.fitBounds(bounds, {
      top: 50,
      right: 50,
      bottom: 50,
      left: 50,
    });
  };

  const { isLoaded, loadError } = useGoogleMapsStatus();

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
        {clusters.map((cluster, index) => (
          <OverlayView
            key={`cluster-${index}`}
            position={cluster.center}
            mapPaneName={OVERLAY_MOUSE_TARGET}
          >
            <div className="relative">
              {cluster.markers.length >= 3 ? (
                // Render cluster
                <button
                  onClick={() => handleClusterClick(cluster)}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-30"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background border-2 border-background shadow-md">
                    <span className="text-sm font-medium">{cluster.markers.length}</span>
                  </div>
                </button>
              ) : (
                // Render individual markers
                cluster.markers.map(({ activity }) => (
                  <CustomMarker
                    key={activity.id}
                    activity={activity}
                    isHighlighted={
                      hoveredActivityId === activity.id || selectedActivityId === activity.id
                    }
                    onClick={() => {
                      setSelectedMarker(activity);
                      onMarkerSelect(activity.id);
                    }}
                    onMouseEnter={() => onMarkerHover(activity.id)}
                    onMouseLeave={() => onMarkerHover(null)}
                    labelPosition={getLabelPosition(
                      { lat: activity.latitude!, lng: activity.longitude! },
                      cluster.markers
                        .filter(m => m.activity.id !== activity.id)
                        .map(m => ({ lat: m.activity.latitude!, lng: m.activity.longitude! })),
                      map?.getCenter() ?? null,
                      map
                    )}
                  />
                ))
              )}
            </div>
          </OverlayView>
        ))}

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
      </GoogleMap>
    </div>
  );
};

export default TripMapView;
