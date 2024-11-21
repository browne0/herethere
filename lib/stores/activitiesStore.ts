import { create } from 'zustand';

import type { ParsedItineraryActivity, ParsedTrip } from '@/app/trips/[tripId]/types';

interface ActivitiesStore {
  activities: ParsedItineraryActivity[];
  setActivities: (activities: ParsedItineraryActivity[]) => void;
  addActivity: (activity: ParsedItineraryActivity) => void;
  removeActivity: (activityId: string) => void;
  tripId: ParsedTrip['id'];
  setTripId: (tripId: ParsedTrip['id']) => void;
}

export const useActivitiesStore = create<ActivitiesStore>(set => ({
  activities: [],
  setActivities: activities => set({ activities }),
  addActivity: activity =>
    set(state => ({
      activities: [...state.activities, activity],
    })),
  removeActivity: activityId =>
    set(state => ({
      activities: state.activities.filter(a => a.id !== activityId),
    })),
  tripId: '',
  setTripId: tripId => set({ tripId }),
}));
