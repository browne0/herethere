'use client';

import { useEffect } from 'react';

import { useActivitiesStore } from '@/lib/stores/activitiesStore';

import { ParsedItineraryActivity, ParsedTrip } from '../types';

interface ItineraryPageClientProps {
  trip: ParsedTrip;
  initialActivities: ParsedItineraryActivity[];
}

export function ItineraryPageClient({ trip, initialActivities }: ItineraryPageClientProps) {
  const { setTrip, setActivities } = useActivitiesStore();

  // Initialize store with server-fetched data
  useEffect(() => {
    setTrip(trip);
    setActivities(initialActivities);
  }, [trip, initialActivities, setTrip, setActivities]);

  return (
    <div className="w-full max-w-md border-r border-gray-200 h-screen overflow-y-auto bg-white">
      {/* Re-use the itinerary view component content from before */}
      {/* ... rest of the itinerary view implementation ... */}
    </div>
  );
}
