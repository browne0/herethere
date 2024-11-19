// lib/stores/tripStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { City, DateRangeType } from '@/lib/types';

interface TripStore {
  city: City | null;
  dates: DateRangeType | null;
  budget: 'budget' | 'moderate' | 'luxury' | null;
  activities: string[];
  customInterests: string | null;
  setCity: (city: City) => void;
  setDates: (dates: DateRangeType) => void;
  setBudget: (budget: 'budget' | 'moderate' | 'luxury') => void;
  setActivities: (activities: string[]) => void;
  setCustomInterests: (interests: string) => void;
  reset: () => void;
}

export const useTripStore = create<TripStore>()(
  persist(
    set => ({
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
    }),
    {
      name: 'trip-creation-store',
    }
  )
);
