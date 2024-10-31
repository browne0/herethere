'use client';

import React from 'react';

import { Activity } from '@prisma/client';
import { format } from 'date-fns';
import { Clock, ArrowRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

import { RouteLoadingSkeleton } from './RouteLoadingSkeleton';

interface RouteSegment {
  distance: string;
  duration: string;
  startActivity: {
    id: string;
    name: string;
    type: string;
    startTime: Date;
    endTime: Date;
  };
  endActivity: {
    id: string;
    name: string;
    type: string;
    startTime: Date;
    endTime: Date;
  };
}

interface RouteSummaryProps {
  activities: Activity[];
}

export function RouteSummary({ activities }: RouteSummaryProps) {
  const [routeSegments, setRouteSegments] = React.useState<RouteSegment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!activities || activities.length < 2) {
      setLoading(false);
      return;
    }

    async function calculateRoutes() {
      const newRouteSegments: RouteSegment[] = [];

      for (let i = 0; i < activities.length - 1; i++) {
        const start = activities[i];
        const end = activities[i + 1];

        // Skip if we don't have valid coordinates
        if (!start.latitude || !start.longitude || !end.latitude || !end.longitude) {
          continue;
        }

        try {
          const response = await fetch('/api/directions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              origin: { lat: start.latitude, lng: start.longitude },
              destination: { lat: end.latitude, lng: end.longitude },
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to fetch directions');
          }

          const data = await response.json();

          newRouteSegments.push({
            distance: data.distance || '',
            duration: data.duration || '',
            startActivity: {
              id: start.id,
              name: start.name,
              type: start.type,
              startTime: start.startTime,
              endTime: start.endTime,
            },
            endActivity: {
              id: end.id,
              name: end.name,
              type: end.type,
              startTime: end.startTime,
              endTime: end.endTime,
            },
          });
        } catch (error) {
          console.error('Direction service failed:', error);
          setError('Failed to calculate route. Please try again later.');
        }
      }

      setRouteSegments(newRouteSegments);
      setLoading(false);
    }

    calculateRoutes();
  }, [activities]);

  if (!activities || activities.length < 2) return null;

  if (loading) {
    return <RouteLoadingSkeleton />;
  }

  if (error) {
    return (
      <Card className="bg-destructive/10">
        <CardHeader>
          <CardTitle className="text-2xl text-destructive">Error Loading Routes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const totalDistance = routeSegments.reduce((acc, segment) => {
    const distance = parseFloat(segment.distance.replace(' mi', ''));
    return acc + (isNaN(distance) ? 0 : distance);
  }, 0);

  const totalDuration = routeSegments.reduce((acc, segment) => {
    const durationMatch = segment.duration.match(/(\d+)\s*min/);
    const minutes = durationMatch ? parseInt(durationMatch[1]) : 0;
    return acc + minutes;
  }, 0);

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Route Summary</CardTitle>
        <div className="flex gap-4">
          <div className="text-sm text-muted-foreground">
            Total Distance: {totalDistance.toFixed(1)} mi
          </div>
          <div className="text-sm text-muted-foreground">
            Total Travel Time: {Math.floor(totalDuration / 60)}h {totalDuration % 60}m
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {routeSegments.map((segment, index) => (
          <div key={index} className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">Stop {index + 1}</Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline">Stop {index + 2}</Badge>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{segment.startActivity.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {format(segment.startActivity.endTime, 'h:mm a')}
                  </div>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{segment.duration}</span>
                  <span className="mx-2">•</span>
                  <span>{segment.distance}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="font-medium">{segment.endActivity.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {format(segment.endActivity.startTime, 'h:mm a')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
