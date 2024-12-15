'use client';

import { ActivityRecommendation } from '@prisma/client';
import { toast } from 'sonner';

import { ActivityStatus, useActivitiesStore } from '@/lib/stores/activitiesStore';

import ActivityShelfComponent from './ActivityShelf';
import { ActivityShelfType } from '../../types';

interface RecommendationsViewProps {
  shelves: ActivityShelfType[];
}

export function RecommendationsView({ shelves }: RecommendationsViewProps) {
  const { addActivity, tripId, updateActivityStatus, findActivityByRecommendationId } =
    useActivitiesStore();

  const handleAddActivity = async (activity: ActivityRecommendation, newStatus: ActivityStatus) => {
    try {
      const existingActivity = findActivityByRecommendationId(activity.id);

      if (existingActivity) {
        // Update existing activity
        const response = await fetch(`/api/trips/${tripId}/activities/${existingActivity.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) throw new Error('Failed to update activity');

        // Update in store
        updateActivityStatus(existingActivity.id, newStatus);

        toast.success('Activity updated!', {
          description:
            newStatus === 'planned'
              ? "We'll schedule this at the best time."
              : "We'll keep this in mind when planning.",
        });
      } else {
        // Create new activity with status
        const response = await fetch(`/api/trips/${tripId}/activities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recommendationId: activity.id,
            status: newStatus,
          }),
        });

        if (!response.ok) throw new Error('Failed to add activity');

        const { activity: newActivity } = await response.json();
        addActivity(newActivity);

        toast.success('Activity added!', {
          description:
            newStatus === 'planned'
              ? "We'll optimize your schedule to fit this in."
              : "We'll keep this in your interests list.",
        });
      }
    } catch (error) {
      console.error('Error managing activity:', error);
      toast.error('Error', {
        description: 'Failed to manage activity. Please try again.',
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      {/* Info Alert for Recommendations */}
      <div className="max-w-7xl mx-auto px-4 py-4 hidden sm:inline">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <h3 className="font-medium text-blue-900">Personalized Recommendations</h3>
          <p className="text-blue-700 text-sm">
            We've curated these activities based on your preferences. Add them to your trip and
            we'll create an optimized itinerary.
          </p>
        </div>
      </div>
      <div className="space-y-8">
        {shelves.map(shelf => (
          <ActivityShelfComponent
            key={shelf.type}
            shelf={shelf}
            onAddActivity={handleAddActivity}
          />
        ))}
      </div>
    </div>
  );
}
