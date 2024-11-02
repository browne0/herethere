// components/trips/DailyRouteSummary.tsx
'use client';

import React from 'react';

import { Activity } from '@prisma/client';
import { format } from 'date-fns';
import { Clock, Navigation, Home, ArrowRight, CalendarDays } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useRouteCalculations } from '@/hooks/useRouteCalculations';
import { getGoogleMapsDirectionsUrl } from '@/lib/maps/utils';
import { Accommodation } from '@/lib/trips';
import { cn } from '@/lib/utils';

import { DirectionsButton } from './DirectionsButton';

interface DailyRouteSummaryProps {
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

export function DailyRouteSummary({
  dates,
  activities,
  selectedDate,
  onDateSelect,
  onActivityHover,
  onActivitySelect,
  hoveredActivityId,
  selectedActivityId,
  accommodation,
}: DailyRouteSummaryProps) {
  // Group activities by date
  const groupedActivities = React.useMemo(() => {
    const groups: Record<string, Activity[]> = {};
    activities.forEach(activity => {
      const date = format(new Date(activity.startTime), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
    });

    // Sort activities within each day
    Object.values(groups).forEach(dayActivities => {
      dayActivities.sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
    });

    return groups;
  }, [activities]);

  return (
    <Tabs value={selectedDate} onValueChange={onDateSelect} className="w-full">
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Daily Routes</CardTitle>
            <TabsList>
              {dates.map(date => (
                <TabsTrigger key={date} value={date} className="min-w-[100px]">
                  {format(new Date(date), 'MMM d')}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {accommodation && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Home className="h-4 w-4" />
              <span>Based at: {accommodation.name}</span>
            </div>
          )}
        </CardHeader>

        {dates.map(date => (
          <TabsContent key={date} value={date} className="m-0">
            <DaySchedule
              date={date}
              activities={groupedActivities[date] || []}
              accommodation={accommodation}
              onActivityHover={onActivityHover}
              onActivitySelect={onActivitySelect}
              hoveredActivityId={hoveredActivityId}
              selectedActivityId={selectedActivityId}
            />
          </TabsContent>
        ))}
      </Card>
    </Tabs>
  );
}

interface DayScheduleProps {
  date: string;
  activities: Activity[];
  accommodation?: Accommodation;
  onActivityHover: (activityId: string | null) => void;
  onActivitySelect: (activityId: string | null) => void;
  hoveredActivityId: string | null;
  selectedActivityId: string | null;
}

function DaySchedule({
  date,
  activities,
  accommodation,
  onActivityHover,
  onActivitySelect,
  hoveredActivityId,
  selectedActivityId,
}: DayScheduleProps) {
  const { routeSegments, isCalculating } = useRouteCalculations(activities, accommodation);

  if (activities.length === 0) {
    return (
      <CardContent>
        <div className="text-center py-12 bg-muted/20 rounded-lg">
          <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Activities Planned</h3>
          <p className="text-muted-foreground mb-4">
            Start adding activities to build your itinerary for this day
          </p>
          <Button asChild>
            <a href={`#add-activity`}>Add First Activity</a>
          </Button>
        </div>
      </CardContent>
    );
  }

  return (
    <CardContent className="p-6">
      <div className="space-y-6">
        {/* Day Summary */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{format(new Date(date), 'EEEE, MMMM d')}</h3>
          <div className="flex gap-2">
            <Badge variant="secondary">
              {activities.length} {activities.length === 1 ? 'Activity' : 'Activities'}
            </Badge>
          </div>
        </div>

        {/* Activities Timeline */}
        <div className="relative">
          {/* <div className="absolute left-8 top-4 bottom-4 w-px bg-muted-foreground/20" /> */}

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
      </div>
    </CardContent>
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
  previousActivity,
  accommodation,
  isLast,
  onHover,
  onSelect,
  isHovered,
  isSelected,
  isCalculatingRoutes,
  isFirstActivity,
  isLastActivity,
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
