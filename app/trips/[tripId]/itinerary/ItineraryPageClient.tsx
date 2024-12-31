'use client';

import { useEffect } from 'react';

import { useActivitiesStore } from '@/lib/stores/activitiesStore';

import type { ParsedTrip, ParsedItineraryActivity } from '../types';
import { ItineraryMap } from './components/ItineraryMap';
import { ItineraryView } from './components/ItineraryView';

interface ItineraryPageClientProps {
  initialTrip: ParsedTrip;
  initialActivities: ParsedItineraryActivity[];
}

export function ItineraryPageClient({ initialTrip, initialActivities }: ItineraryPageClientProps) {
  const { setTrip } = useActivitiesStore();

  // Initialize store with server-fetched data
  useEffect(() => {
    setTrip(initialTrip);
  }, [initialTrip, initialActivities, setTrip]);

  return (
    <div className="flex h-screen">
      <ItineraryView />
      <ItineraryMap />
    </div>
  );
}
