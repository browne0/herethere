import { City } from '@prisma/client';
import { useMutation } from '@tanstack/react-query';
import { create } from 'zustand';

import type {
  ActivityCategoryType,
  ActivityStatus,
  ParsedItineraryActivity,
  ParsedTrip,
} from '@/app/trips/[tripId]/types';
import { ActivityRecommendation } from '@/lib/types/recommendations';

// Core store state interface - Keep this minimal and focused on UI state
interface ActivitiesState {
  trip: ParsedTrip | null;
  categories: ActivityCategoryType[];
  loadingActivities: Set<string>;
  setTrip: (trip: ParsedTrip | null) => void;
  setCategories: (categories: ActivityCategoryType[]) => void;
  findActivityByRecommendationId: (recommendationId: string) => ParsedItineraryActivity | undefined;
}

// API client for activity operations
// Separating API calls makes it easier to maintain, test, and modify endpoints
const activityApi = {
  async addActivity(
    tripId: string,
    activity: Pick<ParsedItineraryActivity, 'recommendationId' | 'status'>
  ) {
    const response = await fetch(`/api/trips/${tripId}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activity),
    });

    if (!response.ok) {
      throw new Error('Failed to add activity');
    }

    return response.json();
  },

  async removeActivity(tripId: string, activityId: string) {
    const response = await fetch(`/api/trips/${tripId}/activities/${activityId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to remove activity');
    }

    return { success: true };
  },

  async updateActivity(tripId: string, activityId: string, updates: UpdateableActivityFields) {
    const response = await fetch(`/api/trips/${tripId}/activities/${activityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update activity');
    }

    return response.json();
  },
};

// Types for activity updates - these match the fields that can be modified
export type UpdateableActivityFields = Partial<
  Pick<ParsedItineraryActivity, 'status' | 'startTime' | 'endTime' | 'transitTimeFromPrevious'>
>;

// Create the base store with UI state management
export const useActivitiesStore = create<ActivitiesState>((set, get) => ({
  trip: null,
  categories: [],
  loadingActivities: new Set(),

  setTrip: trip => set({ trip }),
  setCategories: categories => set({ categories }),

  findActivityByRecommendationId: recommendationId => {
    const state = get();
    return state.trip?.activities.find(activity => activity.recommendationId === recommendationId);
  },
}));

// Helper function to create an optimistic activity that mirrors server response
function createOptimisticActivity(
  tripId: string,
  activity: ActivityRecommendation,
  status: ActivityStatus,
  city: City
): ParsedItineraryActivity {
  return {
    id: `temp-${Date.now()}`,
    tripId,
    recommendationId: activity.id,
    status,
    recommendation: activity,
    startTime: null,
    endTime: null,
    transitTimeFromPrevious: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    city,
  };
}

// Mutation hooks for activity operations
export function useActivityMutations() {
  // Get tripId from the store
  const trip = useActivitiesStore(state => state.trip);

  // Add activity mutation
  const addActivity = useMutation({
    mutationFn: ({
      activity,
      status,
    }: {
      activity: ActivityRecommendation;
      status: ActivityStatus;
    }) => {
      if (!trip) {
        throw new Error('Cannot add activity without trip context');
      }
      return activityApi.addActivity(trip.id, { recommendationId: activity.id, status });
    },

    onMutate: async ({ activity, status }) => {
      if (!trip) {
        throw new Error('Cannot perform optimistic update without trip context');
      }

      // Store previous state for potential rollback
      const previousTrip = useActivitiesStore.getState().trip;

      // Create optimistic activity with complete data
      const optimisticActivity = createOptimisticActivity(
        trip.id,
        activity,
        status,
        previousTrip!.city
      );

      // Update the store optimistically
      useActivitiesStore.setState(state => ({
        trip: state.trip
          ? {
              ...state.trip,
              activities: [...state.trip.activities, optimisticActivity],
            }
          : null,
        loadingActivities: new Set([...state.loadingActivities, activity.id]),
      }));

      // Return context for error handling
      return { previousTrip, optimisticActivity };
    },

    onSuccess: (serverActivity, { activity }) => {
      useActivitiesStore.setState(state => ({
        trip: state.trip
          ? {
              ...state.trip,
              activities: state.trip.activities.map(a =>
                // Match based on the recommendation ID since that's consistent
                a.recommendationId === activity.id ? serverActivity : a
              ),
            }
          : null,
        loadingActivities: new Set([...state.loadingActivities].filter(id => id !== activity.id)),
      }));
    },

    onError: (_, { activity }, context) => {
      // Revert to previous state on error
      if (context?.previousTrip) {
        useActivitiesStore.setState(state => ({
          trip: context.previousTrip,
          loadingActivities: new Set([...state.loadingActivities].filter(id => id !== activity.id)),
        }));
      }
    },
  });

  // Remove activity mutation
  const removeActivity = useMutation({
    mutationFn: (activityId: string) => {
      if (!trip) {
        throw new Error('Cannot add activity without trip context');
      }
      return activityApi.removeActivity(trip.id, activityId);
    },

    onMutate: async activityId => {
      if (!trip) {
        throw new Error('Cannot add activity without trip context');
      }

      const previousTrip = useActivitiesStore.getState().trip;

      // Optimistically remove the activity
      useActivitiesStore.setState(state => ({
        trip: state.trip
          ? {
              ...state.trip,
              activities: state.trip.activities.filter(a => a.id !== activityId),
            }
          : null,
        // Fix the filter condition
        loadingActivities: new Set([...state.loadingActivities, activityId]),
      }));

      return { previousTrip, activityId };
    },

    onSuccess: (_, activityId) => {
      useActivitiesStore.setState(state => ({
        loadingActivities: new Set([...state.loadingActivities].filter(id => id !== activityId)),
      }));
    },

    onError: (_, activityId, context) => {
      if (context?.previousTrip) {
        useActivitiesStore.setState(state => ({
          trip: context.previousTrip,
          loadingActivities: new Set([...state.loadingActivities].filter(id => id !== activityId)),
        }));
      }
    },
  });

  // Update activity mutation
  const updateActivity = useMutation({
    mutationFn: ({
      activityId,
      updates,
    }: {
      activityId: string;
      updates: UpdateableActivityFields;
    }) => {
      if (!trip) {
        throw new Error('Cannot add activity without trip context');
      }
      return activityApi.updateActivity(trip.id, activityId, updates);
    },

    onMutate: async ({ activityId, updates }) => {
      const previousTrip = useActivitiesStore.getState().trip;

      // Apply optimistic update to the activity
      useActivitiesStore.setState(state => ({
        trip: state.trip
          ? {
              ...state.trip,
              activities: state.trip.activities.map(activity =>
                activity.id === activityId
                  ? {
                      ...activity,
                      ...updates,
                      updatedAt: new Date(),
                    }
                  : activity
              ),
            }
          : null,
        loadingActivities: new Set([...state.loadingActivities, activityId]),
      }));

      return { previousTrip, activityId };
    },

    onError: (_, { activityId }, context) => {
      if (context?.previousTrip) {
        useActivitiesStore.setState(state => ({
          trip: context.previousTrip,
          loadingActivities: new Set([...state.loadingActivities].filter(id => id !== activityId)),
        }));
      }
    },
  });

  return {
    addActivity,
    removeActivity,
    updateActivity,
  };
}

// Helper hook to get activity loading state
export function useActivityLoading(activityId: string): boolean {
  return useActivitiesStore(state => state.loadingActivities.has(activityId));
}
