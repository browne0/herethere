'use client';
import React, { useState, useEffect } from 'react';

import { Activity } from '@prisma/client';
import {
  GoogleMap,
  Marker,
  InfoWindow,
  DirectionsRenderer,
  useLoadScript,
} from '@react-google-maps/api';
import { format } from 'date-fns';
import { Loader2, MapPin, Clock, Route as RouteIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface MapData {
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
}

interface RouteSegment {
  distance: string;
  duration: string;
  startActivity: Activity;
  endActivity: Activity;
}

interface TripMapViewProps {
  tripId: string;
}

const libraries: ('places' | 'geometry' | 'drawing' | 'visualization')[] = ['places'];

export const TripMapView: React.FC<TripMapViewProps> = ({ tripId }) => {
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [_, setError] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult[]>([]);
  const [routeSegments, setRouteSegments] = useState<RouteSegment[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number | null>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    libraries,
  });

  // Fetch map data
  useEffect(() => {
    const fetchMapData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/trips/${tripId}/map`);
        if (!response.ok) throw new Error('Failed to fetch map data');
        const data = await response.json();
        setMapData(data);
        await calculateRoutes(data.activities);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchMapData();
  }, [tripId]);

  const calculateRoutes = async (activities: Activity[]) => {
    if (!activities || activities.length < 2) return;

    const directionsService = new google.maps.DirectionsService();
    const newDirections: google.maps.DirectionsResult[] = [];
    const newRouteSegments: RouteSegment[] = [];

    for (let i = 0; i < activities.length - 1; i++) {
      const start = activities[i];
      const end = activities[i + 1];

      try {
        const result = await directionsService.route({
          origin: { lat: start.latitude as number, lng: start.longitude as number },
          destination: { lat: end.latitude as number, lng: end.longitude as number },
          travelMode: google.maps.TravelMode.DRIVING,
          optimizeWaypoints: true,
        });

        const route = result.routes[0];
        const leg = route.legs[0];

        if (leg?.distance && leg?.duration) {
          newDirections.push(result);
          newRouteSegments.push({
            distance: leg.distance.text,
            duration: leg.duration.text,
            startActivity: start,
            endActivity: end,
          });
        }
      } catch (error) {
        console.error('Direction service failed:', error);
      }
    }

    setDirections(newDirections);
    setRouteSegments(newRouteSegments);
  };

  const getMarkerColor = (type: Activity['type']): string => {
    const colors: Record<Activity['type'], string> = {
      DINING: '#ef4444',
      SIGHTSEEING: '#3b82f6',
      ACCOMMODATION: '#22c55e',
      TRANSPORTATION: '#eab308',
      OTHER: '#6b7280',
    };
    return colors[type];
  };

  if (!isLoaded || loading) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/20">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  if (!mapData?.activities.length) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/20">
        <p className="text-muted-foreground">No activities to display</p>
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
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {directions.map((direction, index) => (
          <DirectionsRenderer
            key={index}
            directions={direction}
            options={{
              suppressMarkers: true,
              preserveViewport: true,
              polylineOptions: {
                strokeColor: selectedRouteIndex === index ? '#3b82f6' : '#6b7280',
                strokeWeight: selectedRouteIndex === index ? 4 : 2,
                strokeOpacity: selectedRouteIndex === index ? 1 : 0.6,
              },
            }}
          />
        ))}

        {mapData.activities.map((activity, index) => (
          <Marker
            key={activity.id}
            position={{
              lat: activity.latitude as number,
              lng: activity.longitude as number,
            }}
            onClick={() => setSelectedActivity(activity)}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: getMarkerColor(activity.type),
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#FFFFFF',
            }}
            label={{
              text: String(index + 1),
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          />
        ))}

        {selectedActivity && (
          <InfoWindow
            position={{
              lat: selectedActivity.latitude as number,
              lng: selectedActivity.longitude as number,
            }}
            onCloseClick={() => setSelectedActivity(null)}
          >
            <div className="p-2 max-w-xs">
              <h3 className="font-medium mb-2">{selectedActivity.name}</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <Badge variant="secondary">{selectedActivity.type}</Badge>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{selectedActivity.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    {format(new Date(selectedActivity.startTime), 'h:mm a')} -{' '}
                    {format(new Date(selectedActivity.endTime), 'h:mm a')}
                  </span>
                </div>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Route Information Panel */}
      <Card className="absolute bottom-4 right-4 w-64 bg-white shadow-lg max-h-[40vh] overflow-y-auto">
        <div className="p-4 space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <RouteIcon className="h-4 w-4" />
            Travel Routes
          </h3>
          <div className="space-y-3">
            {routeSegments.map((segment, index) => (
              <div
                key={index}
                className={`p-2 rounded cursor-pointer text-xs ${
                  selectedRouteIndex === index ? 'bg-primary/10' : 'hover:bg-muted'
                }`}
                onClick={() => setSelectedRouteIndex(selectedRouteIndex === index ? null : index)}
              >
                <div className="font-medium mb-1">
                  Stop {index + 1} → {index + 2}
                </div>
                <div className="text-muted-foreground">
                  <div>Distance: {segment.distance}</div>
                  <div>Duration: {segment.duration}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TripMapView;
