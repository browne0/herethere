'use client';

import React, { useEffect } from 'react';

import { Activity, TripStatus } from '@prisma/client';
import { DeepPartial } from 'ai';
import { CalendarDays } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTripActivities } from '@/contexts/TripActivitiesContext';
import { GeneratedActivity } from '@/lib/trip-generation/types';
import { Accommodation } from '@/lib/trips';

import { ActivityTimelineItem } from './ActivityTimelineItem';
import GeneratingActivityList from '../activities/GeneratingActivityList';

interface DailyRouteSummaryProps {
  dates: string[];
  selectedDate: string;
  onDateSelect: (date: string) => void;
  onActivityHover: (activityId: string | null) => void;
  onActivitySelect: (activityId: string | null) => void;
  hoveredActivityId: string | null;
  selectedActivityId: string | null;
  accommodation?: Accommodation;
}

// Type guard to check if we have a complete activity
function isCompleteActivity(activity: any): activity is Activity {
  return (
    activity &&
    typeof activity.id === 'string' &&
    typeof activity.tripId === 'string' &&
    typeof activity.name === 'string'
  );
}

export function DailyRouteSummary({
  accommodation,
  onActivityHover,
  onActivitySelect,
  hoveredActivityId,
  selectedActivityId,
}: DailyRouteSummaryProps) {
  const { activities, trip, isGenerating, error } = useTripActivities();

  useEffect(() => {
    console.log(trip);
  });

  if (error || trip.status === TripStatus.ERROR) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-12 bg-destructive/10 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Generation Failed</h3>
            <p className="text-muted-foreground mb-4">{error?.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show generating activities (streaming state)
  if (isGenerating) {
    return (
      <GeneratingActivityList
        activities={activities as DeepPartial<GeneratedActivity>[]}
        timeZone={trip.timeZone}
      />
    );
  }

  // Handle empty state - only show when generation is complete and no activities
  if (trip.status === TripStatus.COMPLETE && activities.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-12 bg-muted/20 rounded-lg">
            <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Activities Planned</h3>
            <p className="text-muted-foreground mb-4">
              Start adding activities to build your itinerary for this day
            </p>
            <Button asChild>
              <a href="#add-activity">Add First Activity</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show saved activities - only when we have activities and generation is complete
  if (trip.status === TripStatus.COMPLETE) {
    // Filter out any incomplete activities and cast to Activity[]
    const completeActivities = activities.filter(isCompleteActivity);

    return (
      <div>
        {completeActivities.map((activity, index) => {
          const nextActivity = completeActivities[index + 1];
          const previousActivity = completeActivities[index - 1];

          return (
            <div key={activity.id} className="mb-4 lg:mb-8 last:mb-0">
              <ActivityTimelineItem
                timeZone={trip.timeZone}
                activity={activity}
                nextActivity={nextActivity}
                previousActivity={previousActivity}
                isFirstActivity={index === 0}
                isLastActivity={index === completeActivities.length - 1}
                accommodation={accommodation}
                isLast={index === completeActivities.length - 1}
                onHover={onActivityHover}
                onSelect={onActivitySelect}
                isHovered={hoveredActivityId === activity.id}
                isSelected={selectedActivityId === activity.id}
              />
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback empty state
  return null;
}
