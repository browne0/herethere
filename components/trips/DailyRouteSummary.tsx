'use client';

import React from 'react';

import { TripStatus } from '@prisma/client';
import { CalendarDays } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { useTripActivities } from '@/contexts/TripActivitiesContext';
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

export function DailyRouteSummary({
  accommodation,
  onActivityHover,
  onActivitySelect,
  hoveredActivityId,
  selectedActivityId,
}: DailyRouteSummaryProps) {
  const { activities, trip, isGenerating, error } = useTripActivities();

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

  // Use GeneratingActivityList for both streaming and processing states
  if (isGenerating || activities.some(a => a.isProcessing)) {
    return <GeneratingActivityList activities={activities} timeZone={trip.timeZone} />;
  }

  // Show empty state
  if (activities.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-12 bg-muted/20 rounded-lg">
            <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Activities Planned</h3>
            <p className="text-muted-foreground mb-4">
              Start adding activities to build your itinerary for this day
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show completed activities with timeline
  return (
    <div>
      {activities.map((activity, index) => (
        <div key={activity.id} className="mb-4 lg:mb-8 last:mb-0">
          <ActivityTimelineItem
            timeZone={trip.timeZone}
            activity={activity}
            nextActivity={activities[index + 1]}
            previousActivity={activities[index - 1]}
            isFirstActivity={index === 0}
            isLastActivity={index === activities.length - 1}
            accommodation={accommodation}
            isLast={index === activities.length - 1}
            onHover={onActivityHover}
            onSelect={onActivitySelect}
            isHovered={hoveredActivityId === activity.id}
            isSelected={selectedActivityId === activity.id}
          />
        </div>
      ))}
    </div>
  );
}
