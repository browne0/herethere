// lib/stores/tripStore.ts
import { Prisma } from '@prisma/client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { BudgetLevel, DateRangeType } from '@/lib/types';

interface TripFormStore {
  city: Prisma.CityCreateInput | null;
  dates: DateRangeType | null;
  budget: BudgetLevel | null;
  activities: string[];
  customInterests: string | null;
  setCity: (city: Prisma.CityCreateInput) => void;
  setDates: (dates: DateRangeType) => void;
  setBudget: (budget: 'budget' | 'moderate' | 'luxury') => void;
  setActivities: (activities: string[]) => void;
  setCustomInterests: (interests: string) => void;
  reset: () => void;
}

export const useTripFormStore = create<TripFormStore>()(set => ({
  city: null,
  dates: null,
  budget: null,
  activities: [],
  customInterests: null,
  setCity: city => set({ city }),
  setDates: dates => set({ dates }),
  setBudget: budget => set({ budget }),
  setActivities: activities => set({ activities }),
  setCustomInterests: customInterests => set({ customInterests }),
  reset: () => set({ city: null, dates: null, budget: null, activities: [] }),
}));
