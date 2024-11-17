'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

import { Activity, Trip, TripStatus } from '@prisma/client';

import { searchPlaces } from '@/lib/places';
import { PlaceDetails } from '@/lib/trip-generation/types';

export interface ProcessedActivity extends Activity {
  isProcessing?: boolean;
  error?: string;
}

interface TripActivitiesContextType {
  trip: Trip & { activities: Activity[] };
  isGenerating: boolean;
  error: Error | null;
  activities: ProcessedActivity[];
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
  const [trip, setTrip] = useState(initialTrip);
  const [activities, setActivities] = useState<ProcessedActivity[]>(initialTrip.activities);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isGenerationAttempted, setIsGenerationAttempted] = useState(false);

  const processStream = useCallback(async () => {
    setIsGenerating(true);

    try {
      const response = await fetch(`/api/trips/${trip.id}/generate`, {
        method: 'POST',
        body: JSON.stringify({
          city: { name: trip.destination },
          preferences: trip.preferences,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start generation');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const data: { error?: Error; activity: Activity } = JSON.parse(line);

            if (data.error) {
              console.error('Activity error:', data.error);
              continue;
            }

            if (data.activity) {
              // Add activity to state with processing flag
              setActivities(prev => [...prev, { ...data.activity, isProcessing: true }]);

              try {
                const searchResponse = await searchPlaces({
                  query: `${data.activity.name}, ${trip.destination}`,
                  locationBias: `circle:20000@${trip.latitude},${trip.longitude}`,
                });

                if (searchResponse.candidates?.[0]) {
                  const place = searchResponse.candidates[0];
                  if (place.place_id && place.geometry?.location) {
                    const details: PlaceDetails = {
                      placeId: place.place_id,
                      latitude: place.geometry.location.lat,
                      longitude: place.geometry.location.lng,
                      address: place.formatted_address || '',
                    };

                    data.activity = { ...data.activity, ...details };
                  }
                }
              } catch (error) {
                console.error('Place search error:', error);
              }

              // Create activity
              try {
                const activityResponse = await fetch(`/api/trips/${trip.id}/activities`, {
                  method: 'POST',
                  body: JSON.stringify(data.activity),
                });

                if (!activityResponse.ok) throw new Error('Failed to save activity');

                const savedActivity = await activityResponse.json();

                // Update activity in state with place details
                setActivities(prev =>
                  prev.map(act =>
                    act.name === data.activity.name
                      ? { ...savedActivity, isProcessing: false }
                      : act
                  )
                );
              } catch (error) {
                console.error('Place lookup error:', error);
                setActivities(prev =>
                  prev.map(act =>
                    act.name === data.activity.name
                      ? { ...act, isProcessing: false, error: 'Failed to get location' }
                      : act
                  )
                );
              }
            }
          } catch (e) {
            console.error('Failed to parse chunk:', e);
          }
        }
      }

      // Update trip status when everything is done
      await fetch(`/api/trips/${trip.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: TripStatus.COMPLETE }),
      });

      setTrip(prev => ({ ...prev, status: TripStatus.COMPLETE }));
    } catch (e) {
      console.error('Stream processing error:', e);
      setError(e instanceof Error ? e : new Error('Unknown error'));

      // Update trip status to error
      await fetch(`/api/trips/${trip.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: TripStatus.ERROR }),
      });
    } finally {
      setIsGenerating(false);
    }
  }, [trip.destination, trip.id, trip.preferences]);

  // Start generation if trip is in DRAFT status
  useEffect(() => {
    if (trip.status === TripStatus.DRAFT && !isGenerationAttempted) {
      setIsGenerationAttempted(true);
      processStream();
    }
  }, [trip.status, isGenerationAttempted, processStream]);

  const value = {
    trip,
    isGenerating,
    error,
    activities,
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
