import { ParsedItineraryActivity, TripBudget } from '@/app/trips/[tripId]/types';
import {
  CrowdPreference,
  Cuisine,
  EnergyLevel,
  InterestType,
  MealImportance,
  StartTime,
  TransportMode,
} from '@/lib/stores/preferences';

export interface LocationContext {
  type: 'city_center' | 'current_location' | 'activity_cluster';
  reference: {
    latitude: number;
    longitude: number;
  };
  clusters?: Array<{
    center: { latitude: number; longitude: number };
    radius: number;
  }>;
}

export interface ScoringParams {
  cityId: string;
  // From trip preferences
  budget: TripBudget;
  startTime?: string;
  dietaryRestrictions: string[];
  cuisinePreferences: {
    preferred: Cuisine[];
    avoided: Cuisine[];
  };
  mealImportance: MealImportance;

  // From user preferences
  interests: InterestType[];
  transportPreferences: TransportMode[];
  crowdPreference: CrowdPreference;
  energyLevel: EnergyLevel;
  preferredStartTime: StartTime;

  locationContext: LocationContext;
  phase: 'planning' | 'active';
  selectedActivities: ParsedItineraryActivity[];
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export const DEFAULT_PAGE_SIZE = 24;
