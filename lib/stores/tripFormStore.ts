// lib/stores/tripStore.ts
import { Prisma } from '@prisma/client';
import { create } from 'zustand';

import type { BudgetLevel, DateRangeType } from '@/lib/types';

import { Cuisine, DietaryRestriction } from './preferences';

interface TripFormStore {
  city: Prisma.CityCreateInput | null;
  dates: DateRangeType | null;
  budget: BudgetLevel | null;
  activities: string[];
  customInterests: string | null;
  tripDietaryRestrictions: DietaryRestriction[];
  tripCuisinePreferences: {
    preferred: Cuisine[];
    avoided: Cuisine[];
  };
  tripName: string;
  setCity: (city: Prisma.CityCreateInput) => void;
  setDates: (dates: DateRangeType) => void;
  setTripDietaryRestrictions: (restrictions: DietaryRestriction[]) => void;
  setTripCuisinePreferences: (prefs: { preferred: Cuisine[]; avoided: Cuisine[] }) => void;
  setBudget: (budget: 'budget' | 'moderate' | 'luxury') => void;
  setActivities: (activities: string[]) => void;
  setCustomInterests: (interests: string) => void;
  setTripName: (name: string) => void;
  reset: () => void;
}

export const useTripFormStore = create<TripFormStore>()(set => ({
  city: null,
  tripName: '',
  dates: null,
  budget: null,
  activities: [],
  customInterests: null,
  tripDietaryRestrictions: [],
  tripCuisinePreferences: {
    preferred: [],
    avoided: [],
  },
  setTripDietaryRestrictions: tripDietaryRestrictions => set({ tripDietaryRestrictions }),
  setTripCuisinePreferences: tripCuisinePreferences => set({ tripCuisinePreferences }),
  setCity: city => set({ city }),
  setDates: dates => set({ dates }),
  setBudget: budget => set({ budget }),
  setActivities: activities => set({ activities }),
  setCustomInterests: customInterests => set({ customInterests }),
  setTripName: name => set({ tripName: name }),
  reset: () => set({ city: null, dates: null, budget: null, activities: [] }),
}));
