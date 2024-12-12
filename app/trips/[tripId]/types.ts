// app/trips/[tripId]/types.ts
import type { Trip, ActivityRecommendation, ItineraryActivity, City } from '@prisma/client';

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
  neighborhood: string;
  placeId?: string;
}

export interface ParsedItineraryActivity extends Omit<ItineraryActivity, 'customizations'> {
  recommendation: ActivityRecommendation;
  customizations?: {
    duration?: number;
    notes?: string;
    private?: boolean;
  };
}

export interface ActivityShelfType {
  title: string;
  description: string;
  type: string;
  activities: ActivityRecommendation[];
}

// More specific budget and activity types
export type TripBudget = 'budget' | 'moderate' | 'luxury';
export type ActivityType = 'sightseeing' | 'museums' | 'outdoors' | 'shopping' | 'nightlife';

export interface TripPreferences {
  budget: TripBudget;
  activities: ActivityType[];
}

export interface ParsedTrip extends Omit<Trip, 'activities' | 'preferences'> {
  activities: ParsedItineraryActivity[];
  city: City;
  preferences: TripPreferences;
}
