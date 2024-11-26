import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type InterestType =
  | 'outdoors'
  | 'arts'
  | 'food'
  | 'entertainment'
  | 'photography'
  | 'history';
export type PricePreference = 1 | 2 | 3; // 1 = Budget, 2 = Moderate, 3 = Luxury
export type StartTime = 'early' | 'mid' | 'late';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening';
export type TransportMode = 'walking' | 'public-transit' | 'taxi' | 'driving';
export type Cuisine =
  | 'italian'
  | 'japanese'
  | 'chinese'
  | 'indian'
  | 'french'
  | 'mexican'
  | 'thai'
  | 'mediterranean'
  | 'american';
export type DietaryRestriction = 'vegetarian' | 'vegan' | 'halal' | 'kosher' | 'gluten-free';

export interface PreferencesState {
  // Interest Preferences
  interests: InterestType[];
  pricePreference: PricePreference;

  // Pace Preferences
  pacePreference: 'relaxed' | 'balanced' | 'active';
  energyLevel: 1 | 2 | 3;
  preferredStartTime: StartTime;

  // Dietary Preferences
  dietaryRestrictions: DietaryRestriction[];
  cuisinePreferences: {
    preferred: Cuisine[];
    avoided: Cuisine[];
  };
  mealImportance: {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
  };

  // Requirements
  transportPreferences: TransportMode[];

  // Time Preferences
  bestTimeOfDay: TimeOfDay[];
  prefersIndoor: TimeOfDay[];
  prefersOutdoor: TimeOfDay[];
  mealTimes: {
    breakfast?: 'early' | 'late';
    lunch?: 'early' | 'late';
    dinner?: 'early' | 'late';
  };

  // Onboarding State
  onboardingCompleted: boolean;
  currentStep: string;

  // Setters
  setInterests: (interests: InterestType[]) => void;
  setPricePreference: (level: PricePreference) => void;

  setPacePreference: (pace: 'relaxed' | 'balanced' | 'active') => void;
  setEnergyLevel: (level: 1 | 2 | 3) => void;
  setPreferredStartTime: (time: StartTime) => void;

  setDietaryRestrictions: (restrictions: DietaryRestriction[]) => void;
  setCuisinePreferences: (prefs: { preferred: Cuisine[]; avoided: Cuisine[] }) => void;
  setMealImportance: (prefs: { breakfast: boolean; lunch: boolean; dinner: boolean }) => void;

  setTransportPreferences: (modes: TransportMode[]) => void;

  setBestTimeOfDay: (times: TimeOfDay[]) => void;
  setPrefersIndoor: (times: TimeOfDay[]) => void;
  setPrefersOutdoor: (times: TimeOfDay[]) => void;
  setMealTimes: (times: {
    breakfast?: 'early' | 'late';
    lunch?: 'early' | 'late';
    dinner?: 'early' | 'late';
  }) => void;

  setOnboardingCompleted: (completed: boolean) => void;
  setCurrentStep: (step: string) => void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    set => ({
      // Initial Interest States
      interests: [],
      pricePreference: 2,

      // Initial Pace States
      pacePreference: 'balanced',
      energyLevel: 2,
      preferredStartTime: 'mid',

      // Initial Dietary States
      dietaryRestrictions: [],
      cuisinePreferences: {
        preferred: [],
        avoided: [],
      },
      mealImportance: {
        breakfast: true,
        lunch: true,
        dinner: true,
      },

      // Initial Requirement States
      transportPreferences: ['walking', 'public-transit'],

      // Initial Time Preference States
      bestTimeOfDay: ['morning', 'afternoon'],
      prefersIndoor: ['afternoon'],
      prefersOutdoor: ['morning'],
      mealTimes: {},

      // Initial Onboarding State
      onboardingCompleted: false,
      currentStep: 'interests',

      // Setters
      setInterests: interests => set({ interests }),
      setPricePreference: pricePreference => set({ pricePreference }),

      setPacePreference: pacePreference => set({ pacePreference }),
      setEnergyLevel: energyLevel => set({ energyLevel }),
      setPreferredStartTime: preferredStartTime => set({ preferredStartTime }),

      setDietaryRestrictions: dietaryRestrictions => set({ dietaryRestrictions }),
      setCuisinePreferences: cuisinePreferences => set({ cuisinePreferences }),
      setMealImportance: mealImportance => set({ mealImportance }),

      setTransportPreferences: transportPreferences => set({ transportPreferences }),

      setBestTimeOfDay: bestTimeOfDay => set({ bestTimeOfDay }),
      setPrefersIndoor: prefersIndoor => set({ prefersIndoor }),
      setPrefersOutdoor: prefersOutdoor => set({ prefersOutdoor }),
      setMealTimes: mealTimes => set({ mealTimes }),

      setOnboardingCompleted: onboardingCompleted => set({ onboardingCompleted }),
      setCurrentStep: currentStep => set({ currentStep }),
    }),
    {
      name: 'user-preferences',
    }
  )
);
