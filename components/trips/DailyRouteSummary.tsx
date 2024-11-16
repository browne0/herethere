'use client';

import React from 'react';

import { TripStatus } from '@prisma/client';
import { CalendarDays } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTripActivities } from '@/contexts/TripActivitiesContext';
import { useRouteCalculations } from '@/hooks/useRouteCalculations';
import { Accommodation } from '@/lib/trips';
import { cn } from '@/lib/utils';

import { ActivityTimelineItem } from './ActivityTimelineItem';
import { TimeDisplay } from './TimeDisplay';
import { ActivityCategoryBadge } from '../activities/ActivityDetails';

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
  const { activities, trip, isGenerating, error, generatedActivities } = useTripActivities();

  const { routeSegments, isCalculating } = useRouteCalculations(
    isGenerating ? [] : activities,
    isGenerating ? undefined : accommodation
  );

  // Handle error state
  if (error) {
    return (
      <CardContent>
        <div className="text-center py-12 bg-destructive/10 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Generation Failed</h3>
          <p className="text-muted-foreground mb-4">{error.message}</p>
        </div>
      </CardContent>
    );
  }

  // Show generating activities (streaming state)
  if (isGenerating) {
    return (
      <div>
        {generatedActivities?.map((activity, index) => (
          <div className="relative mb-8 last:mb-0" key={`${activity?.name}-${activity?.startTime}`}>
            <Card className={cn('transition-colors')}>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-medium">{activity?.name}</h4>
                  </div>
                  <ActivityCategoryBadge category={activity?.category} />
                </div>

                <TimeDisplay
                  startTime={activity?.startTime}
                  endTime={activity?.endTime}
                  isStreaming={isGenerating}
                  timeZone={trip.timeZone}
                />
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    );
  }

  // Handle empty state - only show when generation is complete and no activities
  if (trip.status === TripStatus.COMPLETE && activities.length === 0) {
    return (
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
    );
  }

  // Show saved activities - only when we have activities and generation is complete
  if (activities.length > 0 && trip.status === TripStatus.COMPLETE) {
    return (
      <div>
        {activities.map((activity, index) => {
          const nextActivity = activities[index + 1];
          const routeKey = nextActivity
            ? `${activity.id}-${nextActivity.id}`
            : index === activities.length - 1 && accommodation
              ? `${activity.id}-accommodation`
              : undefined;
          const routeToNext = routeKey ? routeSegments[routeKey] : undefined;

          return (
            <div key={activity.id} className="mb-4 lg:mb-8 last:mb-0">
              <ActivityTimelineItem
                timeZone={trip.timeZone}
                activity={activity}
                nextActivity={nextActivity}
                previousActivity={activities[index - 1]}
                isFirstActivity={index === 0}
                isLastActivity={index === activities.length - 1}
                accommodation={accommodation}
                isLast={index === activities.length - 1}
                onHover={onActivityHover}
                onSelect={onActivitySelect}
                isHovered={hoveredActivityId === activity.id}
                isSelected={selectedActivityId === activity.id}
                isCalculatingRoutes={isCalculating}
                routeToNext={routeToNext}
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
