import { create } from 'zustand';

import type {
  ActivityCategoryType,
  ParsedItineraryActivity,
  ParsedTrip,
} from '@/app/trips/[tripId]/types';

export type ActivityStatus = 'interested' | 'planned' | 'confirmed' | 'completed' | 'cancelled';

interface ActivitiesStore {
  categories: ActivityCategoryType[];
  setCategories: (categories: ActivityCategoryType[]) => void;
  addActivity: (activity: ParsedItineraryActivity) => void;
  removeActivity: (activityId: string) => void;
  updateActivityStatus: (activityId: string, status: ActivityStatus) => void;
  findActivityByRecommendationId: (recommendationId: string) => ParsedItineraryActivity | undefined;
  trip: ParsedTrip | null;
  setTrip: (trip: ParsedTrip | null) => void;
}

export const useActivitiesStore = create<ActivitiesStore>((set, get) => ({
  trip: null,
  categories: [],
  setTrip: trip => set({ trip }),
  setCategories: categories => set({ categories }),

  addActivity: activity =>
    set(state => ({
      ...state,
      trip: state.trip
        ? {
            ...state.trip,
            activities: [...state.trip.activities, activity],
          }
        : null,
    })),

  removeActivity: activityId =>
    set(state => ({
      ...state,
      trip: state.trip
        ? {
            ...state.trip,
            activities: state.trip.activities.filter(a => a.id !== activityId),
          }
        : null,
    })),

  updateActivityStatus: (activityId, status) =>
    set(state => ({
      ...state,
      trip: state.trip
        ? {
            ...state.trip,
            activities: state.trip.activities.map(activity =>
              activity.id === activityId ? { ...activity, status } : activity
            ),
          }
        : null,
    })),

  findActivityByRecommendationId: recommendationId => {
    const state = get();
    return state.trip?.activities.find(activity => activity.recommendationId === recommendationId);
  },
}));
