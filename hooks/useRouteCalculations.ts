// hooks/useRouteCalculations.ts
import { useState, useEffect } from 'react';

import { Activity } from '@prisma/client';

import { Accommodation } from '@/lib/trips';

interface RouteInfo {
  distance: string;
  duration: string;
}

export function useRouteCalculations(activities: Activity[], accommodation?: Accommodation) {
  const [routeSegments, setRouteSegments] = useState<Record<string, RouteInfo>>({});
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    async function calculateRoutes() {
      if (!activities.length) return;

      setIsCalculating(true);
      const newSegments: Record<string, RouteInfo> = {};

      // Filter activities with valid coordinates
      const validActivities = activities.filter(
        (activity): activity is Activity & { latitude: number; longitude: number } =>
          activity.latitude !== null && activity.longitude !== null
      );

      // Calculate routes between consecutive activities
      for (let i = 0; i < validActivities.length - 1; i++) {
        const current = validActivities[i];
        const next = validActivities[i + 1];

        try {
          const response = await fetch('/api/directions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              origin: {
                lat: current.latitude,
                lng: current.longitude,
              },
              destination: {
                lat: next.latitude,
                lng: next.longitude,
              },
            }),
          });

          if (!response.ok) throw new Error('Failed to fetch route');

          const routeInfo = await response.json();
          newSegments[`${current.id}-${next.id}`] = routeInfo;
        } catch (error) {
          console.error('Failed to calculate route:', error);
        }
      }

      // Calculate routes from/to accommodation if available
      if (accommodation && validActivities.length > 0) {
        try {
          // Route from accommodation to first activity
          const firstActivity = validActivities[0];
          const startResponse = await fetch('/api/directions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              origin: {
                lat: accommodation.latitude,
                lng: accommodation.longitude,
              },
              destination: {
                lat: firstActivity.latitude,
                lng: firstActivity.longitude,
              },
            }),
          });

          if (startResponse.ok) {
            const startRouteInfo = await startResponse.json();
            newSegments[`accommodation-${firstActivity.id}`] = startRouteInfo;
          }

          // Route from last activity to accommodation
          const lastActivity = validActivities[validActivities.length - 1];
          const endResponse = await fetch('/api/directions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              origin: {
                lat: lastActivity.latitude,
                lng: lastActivity.longitude,
              },
              destination: {
                lat: accommodation.latitude,
                lng: accommodation.longitude,
              },
            }),
          });

          if (endResponse.ok) {
            const endRouteInfo = await endResponse.json();
            newSegments[`${lastActivity.id}-accommodation`] = endRouteInfo;
          }
        } catch (error) {
          console.error('Failed to calculate accommodation routes:', error);
        }
      }

      setRouteSegments(newSegments);
      setIsCalculating(false);
    }

    calculateRoutes();
  }, [activities, accommodation]);

  return { routeSegments, isCalculating };
}
