'use client';

import React, { useState, useCallback } from 'react';

import { GoogleMap, Marker, InfoWindow, useLoadScript, Polyline } from '@react-google-maps/api';
import { format } from 'date-fns';
import { Loader2, MapPin, Clock, CalendarDays, MapIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

type Activity = {
  id: string;
  type: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  startTime: string;
  endTime: string;
  notes: string | null;
};

interface TripMapViewProps {
  tripId: string;
}

const libraries: ('places' | 'geometry' | 'drawing' | 'visualization')[] = ['places'];

export function TripMapView({ tripId }: TripMapViewProps) {
  const [mapData, setMapData] = useState<{
    trip: {
      id: string;
      title: string;
      destination: string;
      startDate: string;
      endDate: string;
      bounds: {
        north: number;
        south: number;
        east: number;
        west: number;
      } | null;
    };
    activities: Activity[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [_, setMap] = useState<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    libraries,
  });

  // Fetch map data
  React.useEffect(() => {
    const fetchMapData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/trips/${tripId}/map`);
        if (!response.ok) {
          throw new Error('Failed to fetch map data');
        }
        const data = await response.json();
        setMapData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchMapData();
  }, [tripId]);

  // Handle map load and set bounds
  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      setMap(map);
      if (!mapData?.activities.length) return;

      if (mapData.activities.length === 1) {
        // For single activity, set a reasonable zoom level
        const activity = mapData.activities[0];
        map.setCenter({
          lat: activity.latitude,
          lng: activity.longitude,
        });
        map.setZoom(15); // Adjust this value to get desired zoom level
      } else if (mapData.trip.bounds) {
        // For multiple activities, fit bounds with padding
        const { north, south, east, west } = mapData.trip.bounds;
        map.fitBounds(
          new google.maps.LatLngBounds({ lat: south, lng: west }, { lat: north, lng: east }),
          50 // Adds 50 pixels of padding
        );
      }
    },
    [mapData]
  );

  const getMarkerIcon = useCallback((type: string) => {
    return {
      path: 'M12 0C7.58 0 4 3.58 4 8c0 5.25 8 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8z',
      fillColor: getMarkerColor(type),
      fillOpacity: 1,
      strokeWeight: 2,
      strokeColor: '#FFFFFF',
      scale: 2,
      labelOrigin: new window.google.maps.Point(12, 8),
      anchor: new window.google.maps.Point(12, 21),
    };
  }, []);

  // Get marker color based on activity type
  const getMarkerColor = (type: string) => {
    const colors: Record<string, string> = {
      DINING: '#ef4444', // Red
      SIGHTSEEING: '#3b82f6', // Blue
      ACCOMMODATION: '#22c55e', // Green
      TRANSPORTATION: '#eab308', // Yellow
      OTHER: '#6b7280', // Gray
    };
    return colors[type] || colors.OTHER;
  };

  // Create polyline options using useMemo to avoid recreating on every render
  const polylineOptions = React.useMemo(() => {
    if (!isLoaded) return null;

    return {
      strokeColor: '#6b7280', // gray-500
      strokeOpacity: 0.8,
      strokeWeight: 2,
      icons: [
        {
          icon: {
            path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 3,
            strokeColor: '#4b5563', // gray-600
            fillColor: '#4b5563',
            fillOpacity: 1,
          },
          offset: '50%',
          repeat: '100px',
        },
      ],
    };
  }, [isLoaded]);

  // Function to get path coordinates
  const getPathCoordinates = (activities: Activity[]) => {
    return activities.map(activity => ({
      lat: activity.latitude,
      lng: activity.longitude,
    }));
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
        <div className="text-center text-destructive">
          <p className="font-medium">Failed to load Google Maps</p>
          <p className="text-sm">Please check your API key and try again</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/20">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading activities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-destructive/10">
        <div className="text-center text-destructive">
          <p className="font-medium">Failed to load map data</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!mapData) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/20">
        <p className="text-muted-foreground">No activities to display</p>
      </div>
    );
  }

  if (!mapData?.activities.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-muted/10 px-4">
        <div className="text-center max-w-md mx-auto">
          <MapIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Activities Added Yet</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Add your first activity to see it on the map. You can add restaurants, attractions,
            hotels, and more.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      <GoogleMap
        mapContainerClassName="w-full h-full"
        options={{
          disableDefaultUI: false,
          clickableIcons: false,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
        onLoad={onMapLoad}
      >
        {/* Add path visualization */}
        {polylineOptions && mapData.activities.length > 1 && (
          <Polyline path={getPathCoordinates(mapData.activities)} options={polylineOptions} />
        )}

        {/* Markers with numbers */}
        {mapData?.activities.map((activity, index) => (
          <Marker
            key={activity.id}
            position={{ lat: activity.latitude, lng: activity.longitude }}
            onClick={() => setSelectedActivity(activity)}
            icon={getMarkerIcon(activity.type)}
            label={{
              text: String(index + 1),
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
            zIndex={1000 - index} // Earlier stops appear on top
            animation={window.google.maps.Animation.DROP}
          />
        ))}

        {/* InfoWindow */}
        {selectedActivity && (
          <InfoWindow
            position={{
              lat: selectedActivity.latitude,
              lng: selectedActivity.longitude,
            }}
            onCloseClick={() => setSelectedActivity(null)}
          >
            <div className="p-2 max-w-xs">
              <h3 className="font-medium mb-2">{selectedActivity.name}</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getMarkerColor(selectedActivity.type) }}
                  />
                  <Badge variant="secondary">{selectedActivity.type}</Badge>
                  <Badge variant="outline">
                    Stop #{mapData.activities.findIndex(a => a.id === selectedActivity.id) + 1}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{selectedActivity.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  <span>{format(new Date(selectedActivity.startTime), 'MMMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    {format(new Date(selectedActivity.startTime), 'h:mm a')} -{' '}
                    {format(new Date(selectedActivity.endTime), 'h:mm a')}
                  </span>
                </div>
                {selectedActivity.notes && <p className="mt-2 italic">{selectedActivity.notes}</p>}
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Legend - Update to include path information */}
      {/* Updated Dynamic Legend */}
      <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-lg space-y-4">
        <div>
          <div className="text-sm font-medium mb-2">Activity Types</div>
          <div className="space-y-1">
            {Array.from(new Set(mapData?.activities.map(a => a.type) ?? [])).map(type => {
              const label =
                {
                  DINING: 'Restaurants',
                  SIGHTSEEING: 'Attractions',
                  ACCOMMODATION: 'Hotels',
                  TRANSPORTATION: 'Transport',
                  OTHER: 'Other',
                }[type] ?? type;

              return (
                <div key={type} className="flex items-center gap-2">
                  <div
                    style={{
                      backgroundColor: getMarkerColor(type),
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      border: '2px solid white',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                    }}
                  ></div>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {mapData?.activities.length > 1 && (
          <div>
            <div className="text-sm font-medium mb-2">Route Information</div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div
                  style={{
                    width: '20px',
                    height: '2px',
                    backgroundColor: '#6b7280',
                  }}
                />
                <span className="text-xs text-muted-foreground">Path</span>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <div
                  style={{
                    width: '0',
                    height: '0',
                    borderLeft: '6px solid #6b7280',
                    borderTop: '4px solid transparent',
                    borderBottom: '4px solid transparent',
                  }}
                />
                <span className="text-xs text-muted-foreground">Direction</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
