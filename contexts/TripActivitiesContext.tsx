'use client';

import React, { createContext, useContext, useEffect } from 'react';

import { Activity, Trip, TripStatus } from '@prisma/client';
import { DeepPartial } from 'ai';
import { experimental_useObject as useObject } from 'ai/react';

import { GeneratedActivity } from '@/lib/trip-generation/types';
import { activitiesSchema } from '@/lib/trip-generation-streaming/types';

interface TripActivitiesContextType {
  trip: Trip & { activities: Activity[] };
  isGenerating: boolean;
  error: Error | null;
  activities: Activity[] | DeepPartial<GeneratedActivity>[];
}

interface GenerationResponse {
  activities: GeneratedActivity[];
}

const TripActivitiesContext = createContext<TripActivitiesContextType | undefined>(undefined);

type TripWithActivities = Trip & { activities: Activity[] };

export function TripActivitiesProvider({
  trip: initialTrip,
  children,
}: {
  trip: TripWithActivities;
  children: React.ReactNode;
}) {
  const [trip, setTrip] = React.useState(initialTrip);
  const [activities, setActivities] = React.useState<Activity[]>(initialTrip.activities);
  const [isGenerationAttempted, setIsGenerationAttempted] = React.useState(false);

  const { object, submit, isLoading, error } = useObject<GenerationResponse>({
    api: `/api/trips/${trip.id}/generate`,
    schema: activitiesSchema,
    initialValue: { activities: [] },
  });

  // Start generation if trip is in DRAFT status
  useEffect(() => {
    if (trip.status === TripStatus.DRAFT && !isGenerationAttempted) {
      setIsGenerationAttempted(true);
      void submit({
        city: { name: trip.destination },
        preferences: trip.preferences,
      });
    }
  }, [trip.status, submit, trip.destination, trip.preferences, isGenerationAttempted]);

  // Poll for trip updates while generating
  useEffect(() => {
    if (trip.status !== TripStatus.GENERATING) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/trips/${trip.id}`);
        if (!response.ok) throw new Error('Failed to fetch trip status');
        const updatedTrip = await response.json();
        setTrip(updatedTrip);

        if (updatedTrip.status === TripStatus.COMPLETE) {
          // Fetch final activities
          const tripResponse = await fetch(`/api/trips/${trip.id}`);
          if (!tripResponse.ok) throw new Error('Failed to fetch activities');
          const tripData: TripWithActivities = await tripResponse.json();
          setActivities(tripData.activities);
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Failed to fetch trip:', error);
        clearInterval(pollInterval);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [trip.id, trip.status]);

  const value: TripActivitiesContextType = {
    trip,
    isGenerating: isLoading || trip.status === TripStatus.GENERATING,
    error: error || (trip.status === TripStatus.ERROR ? new Error('Generation failed') : null),
    activities:
      trip.status !== TripStatus.COMPLETE
        ? ((object?.activities ?? []).map(
            activity => activity ?? {}
          ) as DeepPartial<GeneratedActivity>[])
        : activities,
  };

  return <TripActivitiesContext.Provider value={value}>{children}</TripActivitiesContext.Provider>;
}

export function useTripActivities() {
  const context = useContext(TripActivitiesContext);
  if (context === undefined) {
    throw new Error('useTripActivities must be used within a TripActivitiesProvider');
  }
  return context;
}
