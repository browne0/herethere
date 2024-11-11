'use client';

import React, { useEffect, useRef } from 'react';

import { Activity, Trip, TripStatus } from '@prisma/client';
import { experimental_useObject as useObject } from 'ai/react';
import { format, isValid } from 'date-fns';
import { parse } from 'date-fns';
import { Clock, Navigation, ArrowRight, CalendarDays } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRouteCalculations } from '@/hooks/useRouteCalculations';
import { getGoogleMapsDirectionsUrl } from '@/lib/maps/utils';
import { activitiesSchema } from '@/lib/trip-generation-streaming/types';
import { Accommodation } from '@/lib/trips';
import { cn } from '@/lib/utils';

interface DailyRouteSummaryProps {
  trip: Trip;
  dates: string[];
  activities: Activity[];
  selectedDate: string;
  onDateSelect: (date: string) => void;
  onActivityHover: (activityId: string | null) => void;
  onActivitySelect: (activityId: string | null) => void;
  hoveredActivityId: string | null;
  selectedActivityId: string | null;
  accommodation?: Accommodation;
}

interface RouteInfo {
  distance: string;
  duration: string;
}

function TimeDisplay({
  startTime,
  endTime,
  isStreaming,
}: {
  startTime?: string | Date;
  endTime?: string | Date;
  isStreaming: boolean;
}) {
  // If we're streaming and either time is undefined, show shimmer
  if (isStreaming && (!startTime || !endTime)) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <div className="h-4 w-24 bg-muted/80 animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Clock className="h-4 w-4" />
      <span>{`${startTime} - ${endTime}`}</span>
    </div>
  );
}

export function DailyRouteSummary({
  trip,
  activities,
  accommodation,
  onActivityHover,
  onActivitySelect,
  hoveredActivityId,
  selectedActivityId,
}: DailyRouteSummaryProps) {
  const generationAttempted = useRef(false);
  const { object, submit, isLoading } = useObject({
    api: `/api/trips/${trip.id}/generate`,
    schema: activitiesSchema,
    initialValue: { activities: [] },
  });

  const isStreaming = isLoading || trip.status === TripStatus.DRAFT;

  const { routeSegments, isCalculating } = useRouteCalculations(
    isStreaming ? [] : activities,
    isStreaming ? undefined : accommodation
  );

  useEffect(() => {
    if (trip.status === TripStatus.DRAFT && !generationAttempted.current) {
      generationAttempted.current = true;
      void submit({
        city: { name: trip.destination },
        preferences: trip.preferences,
      });
    }
  }, [trip.status, trip.destination, trip.preferences, submit]);

  if (trip.status === TripStatus.ERROR) {
    return (
      <CardContent>
        <div className="text-center py-12 bg-destructive/10 rounded-lg">
          <h3 className="text-lg font-medium mb-2">Generation Failed</h3>
          <p className="text-muted-foreground mb-4">
            There was an error generating your itinerary.
          </p>
          <Button
            onClick={() => {
              generationAttempted.current = false;
              submit({
                city: { name: trip.destination },
                preferences: trip.preferences,
              });
            }}
          >
            Retry Generation
          </Button>
        </div>
      </CardContent>
    );
  }

  if (trip.status === TripStatus.COMPLETE && !activities?.length) {
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

  const activitiesToShow = isStreaming ? object?.activities : activities;

  if (isStreaming) {
    return (
      <div>
        {activitiesToShow?.map((activity, index) => (
          <div className="relative mb-8 last:mb-0" key={index}>
            {/* Activity Card */}
            <Card className={cn('transition-colors')}>
              <CardContent className="p-4 space-y-4">
                {/* Activity Info */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-medium">{activity?.name}</h4>
                  </div>
                  <Badge>{activity?.type}</Badge>
                </div>

                {/* Activity Time */}
                <TimeDisplay
                  startTime={activity?.startTime}
                  endTime={activity?.endTime}
                  isStreaming={isStreaming}
                />
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    );
  }

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
          <div key={activity.id} className="mb-8 last:mb-0">
            <ActivityTimelineItem
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

interface ActivityTimelineItemProps {
  activity: Activity;
  nextActivity?: Activity;
  previousActivity?: Activity;
  accommodation?: Accommodation;
  isLast: boolean;
  onHover: (activityId: string | null) => void;
  onSelect: (activityId: string | null) => void;
  isHovered: boolean;
  isSelected: boolean;
  isCalculatingRoutes: boolean;
  isFirstActivity: boolean;
  isLastActivity: boolean;
  routeToNext?: RouteInfo;
}

function ActivityTimelineItem({
  activity,
  nextActivity,
  accommodation,
  isLast,
  onHover,
  onSelect,
  isHovered,
  isSelected,
  isCalculatingRoutes,
  routeToNext,
}: ActivityTimelineItemProps) {
  return (
    <div className="relative">
      {/* Activity Card */}
      <Card
        className={cn(
          'transition-colors',
          isHovered && 'border-primary',
          isSelected && 'border-primary bg-primary/5'
        )}
        onMouseEnter={() => onHover(activity.id)}
        onMouseLeave={() => onHover(null)}
        onClick={() => onSelect(activity.id)}
      >
        <CardContent className="p-4 space-y-4">
          {/* Activity Info */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="font-medium">{activity.name}</h4>
            </div>
            <Badge>{activity.type}</Badge>
          </div>

          {/* Activity Time */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {format(new Date(activity.startTime), 'h:mm a')} -{' '}
              {format(new Date(activity.endTime), 'h:mm a')}
            </span>
          </div>

          {/* Distance and Next Location */}
          {(nextActivity || (!isLast && accommodation)) && (
            <div className="pt-4 border-t">
              {routeToNext && activity.latitude && activity.longitude && !isCalculatingRoutes && (
                <a
                  href={getGoogleMapsDirectionsUrl(
                    { latitude: activity.latitude, longitude: activity.longitude },
                    nextActivity
                      ? { latitude: nextActivity.latitude!, longitude: nextActivity.longitude! }
                      : { latitude: accommodation!.latitude, longitude: accommodation!.longitude }
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
                >
                  <Navigation className="h-4 w-4 group-hover:text-primary" />
                  <span className="font-medium group-hover:text-primary">
                    {routeToNext.distance}
                  </span>
                  <ArrowRight className="h-4 w-4 group-hover:text-primary" />
                  <span>
                    {routeToNext.duration} to{' '}
                    {nextActivity ? nextActivity.name : accommodation?.name}
                  </span>
                </a>
              )}
              {isCalculatingRoutes && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                  <Navigation className="h-4 w-4" />
                  <span>Calculating route...</span>
                </div>
              )}
              {!routeToNext && !isCalculatingRoutes && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Navigation className="h-4 w-4" />
                  <span>Unable to calculate route</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
