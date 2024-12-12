import { TripBudget } from '@/app/trips/[tripId]/types';
import { CrowdPreference, Cuisine, InterestType, TransportMode } from '@/lib/stores/preferences';

export interface ScoringParams {
  // From trip preferences
  budget: TripBudget;
  startTime?: string;
  dietaryRestrictions: string[];
  cuisinePreferences: {
    preferred: Cuisine[];
    avoided: Cuisine[];
  };

  // From user preferences
  interests: InterestType[];
  transportPreferences: TransportMode[];
  crowdPreference: CrowdPreference;
  energyLevel: 1 | 2 | 3;

  // Optional context
  currentLocation?: {
    lat: number;
    lng: number;
  };
}
