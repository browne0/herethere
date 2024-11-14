'use client';

import { Suspense } from 'react';

import { useTripActivities } from '@/contexts/TripActivitiesContext';

import { QuickActions } from './TripQuickActions';
import { TripStats } from './TripStats';
import { TripViewContainer } from './TripViewContainer';

function MapLoadingFallback() {
  return (
    <div className="h-full flex items-center justify-center bg-muted/20">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    </div>
  );
}

export function TripContent() {
  const { trip } = useTripActivities();

  return (
    <div className="px-4 lg:px-8 py-6 space-y-6">
      <QuickActions />
      <TripStats />
      <Suspense fallback={<MapLoadingFallback />}>
        <TripViewContainer
          startDate={new Date(trip.startDate)}
          endDate={new Date(trip.endDate)}
          accommodation={trip.preferences?.accommodation}
        />
      </Suspense>
    </div>
  );
}
