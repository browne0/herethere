import { create } from 'zustand';

import type {
  ActivityCategoryType,
  ParsedItineraryActivity,
  ParsedTrip,
} from '@/app/trips/[tripId]/types';

export type ActivityStatus = 'interested' | 'planned' | 'confirmed' | 'completed' | 'cancelled';

export type UpdateableActivityFields = Partial<
  Pick<ParsedItineraryActivity, 'status' | 'startTime' | 'endTime' | 'transitTimeFromPrevious'>
>;

interface ActivitiesStore {
  categories: ActivityCategoryType[];
  setCategories: (categories: ActivityCategoryType[]) => void;
  addActivity: (
    tripId: string,
    activity: Pick<ParsedItineraryActivity, 'recommendationId' | 'status'>
  ) => Promise<void>;
  removeActivity: (tripId: string, activityId: string) => Promise<void>;
  updateActivity: (
    tripId: string,
    activityId: string,
    updates: UpdateableActivityFields
  ) => Promise<void>;
  findActivityByRecommendationId: (recommendationId: string) => ParsedItineraryActivity | undefined;
  trip: ParsedTrip | null;
  setTrip: (trip: ParsedTrip | null) => void;
  error: string | null;
  loadingActivities: Set<string>;
}

export const useActivitiesStore = create<ActivitiesStore>((set, get) => ({
  trip: null,
  categories: [],
  setTrip: trip => set({ trip }),
  setCategories: categories => set({ categories }),
  error: null,
  loadingActivities: new Set(),

  addActivity: async (tripId, activity) => {
    const activityId = activity.recommendationId;
    set(state => ({
      loadingActivities: new Set(state.loadingActivities).add(activityId),
    }));
    try {
      const response = await fetch(`/api/trips/${tripId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activity),
      });

      if (!response.ok) throw new Error('Failed to add activity');
      const newActivity = await response.json();

      set(state => ({
        trip: state.trip
          ? {
              ...state.trip,
              activities: [...state.trip.activities, newActivity],
            }
          : null,
        // Remove this activity from loading set
        loadingActivities: new Set([...state.loadingActivities].filter(id => id !== activityId)),
      }));
    } catch (error) {
      set(state => ({
        error: error instanceof Error ? error.message : 'Failed to add activity',
        loadingActivities: new Set([...state.loadingActivities].filter(id => id !== activityId)),
      }));
      throw error;
    }
  },

  removeActivity: async (tripId, activityId) => {
    set(state => ({
      loadingActivities: new Set(state.loadingActivities).add(activityId),
    }));

    try {
      const response = await fetch(`/api/trips/${tripId}/activities/${activityId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to remove activity');

      set(state => ({
        trip: state.trip
          ? {
              ...state.trip,
              activities: state.trip.activities.filter(a => a.id !== activityId),
            }
          : null,
        loadingActivities: new Set([...state.loadingActivities].filter(id => id !== activityId)),
      }));
    } catch (error) {
      set(state => ({
        error: error instanceof Error ? error.message : 'Failed to remove activity',
        loadingActivities: new Set([...state.loadingActivities].filter(id => id !== activityId)),
      }));
      throw error;
    }
  },

  updateActivity: async (tripId, activityId, updates) => {
    set(state => ({
      loadingActivities: new Set(state.loadingActivities).add(activityId),
    }));

    try {
      const response = await fetch(`/api/trips/${tripId}/activities/${activityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update activity');
      const updatedActivity = await response.json();

      set(state => ({
        trip: state.trip
          ? {
              ...state.trip,
              activities: state.trip.activities.map(activity =>
                activity.id === activityId ? updatedActivity : activity
              ),
            }
          : null,
        loadingActivities: new Set([...state.loadingActivities].filter(id => id !== activityId)),
      }));
    } catch (error) {
      set(state => ({
        error: error instanceof Error ? error.message : 'Failed to update activity',
        loadingActivities: new Set([...state.loadingActivities].filter(id => id !== activityId)),
      }));
      throw error;
    }
  },

  findActivityByRecommendationId: recommendationId => {
    const state = get();
    return state.trip?.activities.find(activity => activity.recommendationId === recommendationId);
  },
}));
