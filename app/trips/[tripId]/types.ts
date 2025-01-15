// app/trips/[tripId]/types.ts
import type { City, ItineraryActivity, Trip } from '@prisma/client';

import { Cuisine, DietaryRestriction } from '@/lib/stores/preferences';
import { ActivityCategoryDetails } from '@/lib/types/activities';
import { ActivityRecommendation } from '@/lib/types/recommendations';
export interface Location {
  latitude: number;
  longitude: number;
  address: string;
  neighborhood: string;
  placeId?: string;
}

export type ActivityStatus = 'interested' | 'planned' | 'completed' | 'cancelled';

export interface ParsedItineraryActivity extends ItineraryActivity {
  recommendation: ActivityRecommendation;
  status: ActivityStatus;
  city: City;
}

export interface ActivityCategoryType {
  type: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  activities: ActivityRecommendation[];
  pagination: {
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// More specific budget and activity types
export type TripBudget = 'budget' | 'moderate' | 'luxury';

export interface TripPreferences {
  budget: TripBudget;
  activities: ActivityCategoryDetails[];
  dietaryRestrictions: DietaryRestriction[];
  cuisinePreferences: {
    preferred: Cuisine[];
    avoided: Cuisine[];
  };
}

export interface ParsedTrip extends Omit<Trip, 'activities' | 'preferences'> {
  activities: ParsedItineraryActivity[];
  city: City;
  preferences: TripPreferences;
}
