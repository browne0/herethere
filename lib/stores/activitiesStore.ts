import { create } from 'zustand';

import type { ParsedItineraryActivity, ParsedTrip } from '@/app/trips/[tripId]/types';

export type ActivityStatus = 'interested' | 'planned' | 'confirmed' | 'completed' | 'cancelled';

interface ActivitiesStore {
  activities: ParsedItineraryActivity[];
  setActivities: (activities: ParsedItineraryActivity[]) => void;
  addActivity: (activity: ParsedItineraryActivity) => void;
  removeActivity: (activityId: string) => void;
  updateActivityStatus: (activityId: string, status: ActivityStatus) => void;
  findActivityByRecommendationId: (recommendationId: string) => ParsedItineraryActivity | undefined;
  tripId: ParsedTrip['id'];
  setTripId: (tripId: ParsedTrip['id']) => void;
}

export const useActivitiesStore = create<ActivitiesStore>((set, get) => ({
  activities: [],
  tripId: '',

  setActivities: activities => set({ activities }),

  setTripId: tripId => set({ tripId }),

  addActivity: activity =>
    set(state => ({
      activities: [...state.activities, activity],
    })),

  removeActivity: activityId =>
    set(state => ({
      activities: state.activities.filter(a => a.id !== activityId),
    })),

  updateActivityStatus: (activityId, status) =>
    set(state => ({
      activities: state.activities.map(activity =>
        activity.id === activityId ? { ...activity, status } : activity
      ),
    })),

  // Helper method to find an activity by its recommendation ID
  findActivityByRecommendationId: recommendationId => {
    const state = get();
    return state.activities.find(activity => activity.recommendationId === recommendationId);
  },
}));
