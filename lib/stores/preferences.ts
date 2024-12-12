import { create } from 'zustand';

export type InterestType =
  | 'outdoors'
  | 'arts'
  | 'food'
  | 'entertainment'
  | 'photography'
  | 'history';
export type PricePreference = 1 | 2 | 3; // 1 = Budget, 2 = Moderate, 3 = Luxury
export type StartTime = 'early' | 'mid' | 'late';
export type TransportMode = 'walking' | 'public-transit' | 'taxi' | 'driving';
export type Cuisine =
  | 'afghani'
  | 'african'
  | 'american'
  | 'asian'
  | 'brazilian'
  | 'chinese'
  | 'french'
  | 'greek'
  | 'indian'
  | 'italian'
  | 'japanese'
  | 'korean'
  | 'lebanese'
  | 'mexican'
  | 'middle_eastern'
  | 'seafood'
  | 'spanish'
  | 'steak'
  | 'thai'
  | 'turkish'
  | 'vietnamese';
export type DietaryRestriction =
  | 'vegetarian'
  | 'vegan'
  | 'halal'
  | 'kosher'
  | 'gluten-free'
  | 'none';
export type CrowdPreference = 'popular' | 'hidden' | 'mixed';

export interface UserPreferences {
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

  // Transportation Requirements
  transportPreferences: TransportMode[];

  // Crowd Preferences
  crowdPreference: CrowdPreference;
}

export interface PreferencesState extends UserPreferences {
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
  setCrowdPreference: (preference: CrowdPreference) => void;

  setTransportPreferences: (modes: TransportMode[]) => void;

  setOnboardingCompleted: (completed: boolean) => void;
  setCurrentStep: (step: string) => void;
  setAllPreferences: (preferences: Partial<PreferencesState>) => void;
}

export const usePreferences = create<PreferencesState>()(set => ({
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
    breakfast: false,
    lunch: false,
    dinner: false,
  },

  crowdPreference: 'hidden',

  // Initial Requirement States
  transportPreferences: ['walking', 'taxi'],

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

  setCrowdPreference: crowdPreference => set({ crowdPreference }),

  setTransportPreferences: transportPreferences => set({ transportPreferences }),

  setOnboardingCompleted: onboardingCompleted => set({ onboardingCompleted }),
  setCurrentStep: currentStep => set({ currentStep }),
  setAllPreferences: (preferences: Partial<PreferencesState>) =>
    set(state => ({
      ...state,
      interests: preferences.interests ?? state.interests,
      pricePreference: preferences.pricePreference ?? state.pricePreference,
      pacePreference: preferences.pacePreference ?? state.pacePreference,
      energyLevel: preferences.energyLevel ?? state.energyLevel,
      preferredStartTime: preferences.preferredStartTime ?? state.preferredStartTime,
      dietaryRestrictions: preferences.dietaryRestrictions ?? state.dietaryRestrictions,
      cuisinePreferences: preferences.cuisinePreferences ?? state.cuisinePreferences,
      mealImportance: preferences.mealImportance ?? state.mealImportance,
      crowdPreference: preferences.crowdPreference ?? state.crowdPreference,
      transportPreferences: preferences.transportPreferences ?? state.transportPreferences,
    })),
}));
