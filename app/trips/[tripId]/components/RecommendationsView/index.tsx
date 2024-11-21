'use client';

import { useToast } from '@/hooks/use-toast';
import { useActivitiesStore } from '@/lib/stores/activitiesStore';

import { ActivityShelfComponent } from './ActivityShelf';
import type { ParsedActivityRecommendation } from '../../types';

interface RecommendationsViewProps {
  shelves: {
    title: string;
    type: string;
    activities: ParsedActivityRecommendation[];
  }[];
}

export function RecommendationsView({ shelves }: RecommendationsViewProps) {
  const { addActivity, tripId } = useActivitiesStore();
  const { toast } = useToast();

  const handleAddActivity = async (activity: ParsedActivityRecommendation) => {
    try {
      const response = await fetch(`/api/trips/${tripId}/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recommendationId: activity.id,
          startTime: new Date().toISOString(), // This will be properly scheduled by the backend
        }),
      });

      if (!response.ok) throw new Error('Failed to add activity');

      const { activity: newActivity } = await response.json();

      // Parse the response data
      const parsedActivity = {
        ...newActivity,
        recommendation: {
          ...newActivity.recommendation,
          location: JSON.parse(newActivity.recommendation.location),
          images: JSON.parse(newActivity.recommendation.images),
          availableDays: JSON.parse(newActivity.recommendation.availableDays),
          openingHours: newActivity.recommendation.openingHours
            ? JSON.parse(newActivity.recommendation.openingHours)
            : null,
          seasonality: JSON.parse(newActivity.recommendation.seasonality),
          tags: JSON.parse(newActivity.recommendation.tags),
        },
        customizations: newActivity.customizations ? JSON.parse(newActivity.customizations) : null,
      };

      addActivity(parsedActivity);

      toast({
        title: 'Activity added!',
        description: "We'll schedule this at the best time for your trip.",
      });
    } catch (error) {
      console.error('Error adding activity:', error);
      toast({
        title: 'Error',
        description: 'Failed to add activity. Please try again.',
        variant: 'destructive',
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
      <div className="space-y-12">
        {shelves.map(shelf => (
          <ActivityShelfComponent
            key={shelf.type}
            title={shelf.title}
            activities={shelf.activities}
            onAddActivity={handleAddActivity}
          />
        ))}
      </div>
    </div>
  );
}
