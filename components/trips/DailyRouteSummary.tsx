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
import { Accommodation } from '@/lib/trips';
import { cn } from '@/lib/utils';

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
  isLoadingRoutes?: boolean;
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
  isLoadingRoutes,
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
              isLoadingRoutes={isLoadingRoutes}
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
  isLoadingRoutes?: boolean;
}

function DaySchedule({
  date,
  activities,
  accommodation,
  onActivityHover,
  onActivitySelect,
  hoveredActivityId,
  selectedActivityId,
  isLoadingRoutes,
}: DayScheduleProps) {
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
          <div className="absolute left-8 top-4 bottom-4 w-px bg-muted-foreground/20" />

          {activities.map((activity, index) => (
            <div key={activity.id} className="mb-8 last:mb-0">
              <ActivityTimelineItem
                activity={activity}
                nextActivity={activities[index + 1]}
                accommodation={accommodation}
                isLast={index === activities.length - 1}
                onHover={onActivityHover}
                onSelect={onActivitySelect}
                isHovered={hoveredActivityId === activity.id}
                isSelected={selectedActivityId === activity.id}
                isLoadingRoute={isLoadingRoutes}
              />
            </div>
          ))}
        </div>
      </div>
    </CardContent>
  );
}

interface ActivityTimelineItemProps {
  activity: Activity;
  nextActivity?: Activity;
  accommodation?: Accommodation;
  isLast: boolean;
  onHover: (activityId: string | null) => void;
  onSelect: (activityId: string | null) => void;
  isHovered: boolean;
  isSelected: boolean;
  isLoadingRoute?: boolean;
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
  isLoadingRoute,
}: ActivityTimelineItemProps) {
  return (
    <div className="relative ml-16">
      {/* Time Marker */}
      <div className="absolute -left-12 w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center text-xs">
        {format(new Date(activity.startTime), 'HH:mm')}
      </div>

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
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="font-medium">{activity.name}</h4>
              {activity.address && (
                <p className="text-sm text-muted-foreground mt-1">{activity.address}</p>
              )}
            </div>
            <Badge>{activity.type}</Badge>
          </div>

          {/* Duration */}
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {format(new Date(activity.startTime), 'h:mm a')} -{' '}
              {format(new Date(activity.endTime), 'h:mm a')}
            </span>
          </div>

          {/* Travel to Next Location */}
          {(nextActivity || (!isLast && accommodation)) && (
            <div
              className={cn(
                'mt-3 pt-3 border-t flex items-center gap-2 text-sm text-muted-foreground',
                isLoadingRoute && 'animate-pulse'
              )}
            >
              <Navigation className="h-4 w-4" />
              <ArrowRight className="h-4 w-4" />
              <span>
                {isLoadingRoute
                  ? 'Calculating route...'
                  : `20 min to ${nextActivity ? nextActivity.name : accommodation?.name}`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
