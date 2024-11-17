'use client';

import { Suspense } from 'react';

import { useTripActivities } from '@/contexts/TripActivitiesContext';

import { QuickActions } from './TripQuickActions';
import { TripStats } from './TripStats';
import { TripViewContainer } from './TripViewContainer';

export function TripContent() {
  const { trip } = useTripActivities();

  return (
    <div className="px-4 lg:px-8 py-6 space-y-6">
      <QuickActions />
      <TripStats />
      <Suspense fallback={<div>Loading...</div>}>
        <TripViewContainer
          startDate={new Date(trip.startDate)}
          endDate={new Date(trip.endDate)}
          accommodation={trip.preferences?.accommodation}
        />
      </Suspense>
    </div>
  );
}
