import React, { useState } from 'react';

import { Activity } from '@prisma/client';
import { format, differenceInDays } from 'date-fns';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { CalendarDays } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { useTripActivities } from '@/contexts/TripActivitiesContext';

import { ActivityTimelineItem } from './ActivityTimelineItem';
import GeneratingActivityList from '../activities/GeneratingActivityList';

interface DailyRouteSummaryProps {
  onActivityHover: (activityId: string | null) => void;
  onActivitySelect: (activityId: string | null) => void;
  hoveredActivityId: string | null;
  selectedActivityId: string | null;
}

interface ActivityGroup {
  dayNumber: number;
  date: Date;
  activities: Activity[];
}

export function DailyRouteSummary({
  onActivityHover,
  onActivitySelect,
  hoveredActivityId,
  selectedActivityId,
}: DailyRouteSummaryProps) {
  const { activities, trip, isGenerating, error } = useTripActivities();
  const [expandedDays, setExpandedDays] = useState<number[]>([1]);

  // Handle error state
  if (error || trip.status === 'ERROR') {
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

  // Handle generating state
  if (isGenerating || activities.some(a => a.isProcessing)) {
    return <GeneratingActivityList activities={activities} timeZone={trip.timeZone} />;
  }

  // Handle empty state
  if (activities.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-12 bg-muted/20 rounded-lg">
            <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Activities Planned</h3>
            <p className="text-muted-foreground mb-4">
              Start adding activities to build your itinerary
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group activities by day
  const groupedActivities = activities.reduce<Record<number, ActivityGroup>>((acc, activity) => {
    const dayNumber = activity.dayNumber;
    if (!acc[dayNumber]) {
      acc[dayNumber] = {
        dayNumber,
        date: new Date(trip.startDate.getTime() + (dayNumber - 1) * 24 * 60 * 60 * 1000),
        activities: [],
      };
    }
    acc[dayNumber].activities.push(activity);
    return acc;
  }, {});

  // Sort activities within each day by start time
  Object.values(groupedActivities).forEach(group => {
    group.activities.sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  });

  const toggleDay = (dayNumber: number) => {
    setExpandedDays(current =>
      current.includes(dayNumber) ? current.filter(d => d !== dayNumber) : [...current, dayNumber]
    );
  };

  // Get day title
  const getDayTitle = (dayNumber: number, date: Date) => {
    if (dayNumber === 1) return 'Arrival Day';
    const lastDay =
      differenceInDays(new Date(activities[activities.length - 1].endTime), trip.startDate) + 1;
    if (dayNumber === lastDay) return 'Departure Day';
    return `Day ${dayNumber}`;
  };

  return (
    <div className="space-y-4">
      {Object.values(groupedActivities)
        .sort((a, b) => a.dayNumber - b.dayNumber)
        .map(group => (
          <div key={group.dayNumber} className="border rounded-lg overflow-hidden bg-white">
            {/* Day Header */}
            <button
              onClick={() => toggleDay(group.dayNumber)}
              className="w-full px-4 py-3 flex items-center gap-2 hover:bg-gray-50 text-left"
            >
              {expandedDays.includes(group.dayNumber) ? (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-500" />
              )}
              <div className="flex-1">
                <span className="font-medium">{getDayTitle(group.dayNumber, group.date)}</span>
                <span className="text-gray-500 ml-2">{format(group.date, 'MMM d')}</span>
              </div>
              <span className="text-sm text-gray-500">{group.activities.length} activities</span>
            </button>

            {/* Activities */}
            {expandedDays.includes(group.dayNumber) && (
              <div className="border-t">
                {group.activities.map((activity, index) => (
                  <div key={activity.id} className="border-b last:border-b-0">
                    <ActivityTimelineItem
                      activity={activity}
                      timeZone={trip.timeZone}
                      nextActivity={group.activities[index + 1]}
                      previousActivity={group.activities[index - 1]}
                      isLast={index === group.activities.length - 1}
                      onHover={onActivityHover}
                      onSelect={onActivitySelect}
                      isHovered={hoveredActivityId === activity.id}
                      isSelected={selectedActivityId === activity.id}
                      isFirstActivity={index === 0}
                      isLastActivity={index === group.activities.length - 1}
                    />
                  </div>
                ))}

                {/* Add Activity Button */}
                <button className="w-full p-4 text-sm text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Activity
                </button>
              </div>
            )}
          </div>
        ))}
    </div>
  );
}
