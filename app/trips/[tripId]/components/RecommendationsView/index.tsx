'use client';

import { useState } from 'react';

import { Info } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

import { ActivityShelfComponent } from './ActivityShelf';
import type { ParsedActivityRecommendation } from '../../types';

interface RecommendationsViewProps {
  shelves: {
    title: string;
    type: string;
    activities: ParsedActivityRecommendation[];
  }[];
  tripId: string;
  existingActivityIds: string[];
}

export function RecommendationsView({
  shelves,
  tripId,
  existingActivityIds,
}: RecommendationsViewProps) {
  const [addedActivities, setAddedActivities] = useState<Set<string>>(new Set(existingActivityIds));
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

      setAddedActivities(prev => new Set([...prev, activity.id]));

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
            addedActivityIds={addedActivities}
          />
        ))}
      </div>
    </div>
  );
}
