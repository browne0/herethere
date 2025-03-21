import { create } from 'zustand';

import { RESTAURANT_TYPES } from '@/constants';

export type InterestType =
  | 'outdoors'
  | 'arts'
  | 'food'
  | 'entertainment'
  | 'photography'
  | 'history';
export type StartTime = 'early' | 'mid' | 'late' | null;
export type TransportMode = 'walking' | 'public-transit' | 'taxi' | 'driving';
export type Cuisine = keyof typeof RESTAURANT_TYPES;
export type DietaryRestriction = 'vegetarian' | 'vegan' | 'none';
export type CrowdPreference = 'popular' | 'hidden' | 'mixed' | null;
export type MealImportance = {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
};
export type EnergyLevel = 1 | 2 | 3 | null;

export interface UserPreferences {
  // Interest Preferences
  interests: InterestType[];
  // Pace Preferences
  energyLevel: EnergyLevel;
  preferredStartTime: StartTime;

  // Dietary Preferences
  dietaryRestrictions: DietaryRestriction[];
  cuisinePreferences: {
    preferred: Cuisine[];
    avoided: Cuisine[];
  };
  mealImportance: MealImportance;

  // Transportation Requirements
  transportPreferences: TransportMode[];

  // Crowd Preferences
  crowdPreference: CrowdPreference;
}

export interface PreferencesState extends UserPreferences {
  // Onboarding State
  onboardingCompleted: boolean;

  // Setters
  setInterests: (interests: InterestType[]) => void;

  setEnergyLevel: (level: EnergyLevel) => void;
  setPreferredStartTime: (time: StartTime) => void;

  setDietaryRestrictions: (restrictions: DietaryRestriction[]) => void;
  setCuisinePreferences: (prefs: { preferred: Cuisine[]; avoided: Cuisine[] }) => void;
  setMealImportance: (prefs: { breakfast: boolean; lunch: boolean; dinner: boolean }) => void;
  setCrowdPreference: (preference: CrowdPreference) => void;

  setTransportPreferences: (modes: TransportMode[]) => void;

  setOnboardingCompleted: (completed: boolean) => void;
  setAllPreferences: (preferences: Partial<PreferencesState>) => void;
  reset: () => void;
}

export const usePreferences = create<PreferencesState>()(set => ({
  // Initial Interest States
  interests: [],

  // Initial Pace States
  energyLevel: null,
  preferredStartTime: null,

  // Initial Dietary States
  dietaryRestrictions: [],
  cuisinePreferences: {
    preferred: [],
    avoided: [],
  },
  mealImportance: {
    breakfast: false,
    lunch: false,
    dinner: false,
  },

  crowdPreference: null,

  // Initial Requirement States
  transportPreferences: [],

  // Initial Onboarding State
  onboardingCompleted: false,

  // Setters
  setInterests: interests => set({ interests }),
  setEnergyLevel: energyLevel => set({ energyLevel }),
  setPreferredStartTime: preferredStartTime => set({ preferredStartTime }),
  setDietaryRestrictions: dietaryRestrictions => set({ dietaryRestrictions }),
  setCuisinePreferences: cuisinePreferences => set({ cuisinePreferences }),
  setMealImportance: mealImportance => set({ mealImportance }),
  setCrowdPreference: crowdPreference => set({ crowdPreference }),
  setTransportPreferences: transportPreferences => set({ transportPreferences }),
  setOnboardingCompleted: onboardingCompleted => set({ onboardingCompleted }),
  setAllPreferences: (preferences: Partial<PreferencesState>) =>
    set(state => ({
      ...state,
      interests: preferences.interests ?? state.interests,
      energyLevel: preferences.energyLevel ?? state.energyLevel,
      preferredStartTime: preferences.preferredStartTime ?? state.preferredStartTime,
      dietaryRestrictions: preferences.dietaryRestrictions ?? state.dietaryRestrictions,
      cuisinePreferences: preferences.cuisinePreferences ?? state.cuisinePreferences,
      mealImportance: preferences.mealImportance ?? state.mealImportance,
      crowdPreference: preferences.crowdPreference ?? state.crowdPreference,
      transportPreferences: preferences.transportPreferences ?? state.transportPreferences,
    })),
  reset: () => {
    set(() => ({
      // Initial Interest States
      interests: [],

      // Initial Pace States
      energyLevel: null,
      preferredStartTime: null,

      // Initial Dietary States
      dietaryRestrictions: [],
      cuisinePreferences: {
        preferred: [],
        avoided: [],
      },
      mealImportance: {
        breakfast: false,
        lunch: false,
        dinner: false,
      },

      crowdPreference: null,

      // Initial Requirement States
      transportPreferences: [],

      // Initial Onboarding State
      onboardingCompleted: false,
    }));
  },
}));
