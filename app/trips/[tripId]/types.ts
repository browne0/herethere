// app/trips/[tripId]/types.ts
import type { Trip, ActivityRecommendation, ItineraryActivity, City } from '@prisma/client';

import { ActivityCategoryDetails } from '@/lib/types/activities';

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

export interface TripPreferences {
  budget: TripBudget;
  activities: ActivityCategoryDetails[];
}

export interface ParsedTrip extends Omit<Trip, 'activities' | 'preferences'> {
  activities: ParsedItineraryActivity[];
  city: City;
  preferences: TripPreferences;
}
