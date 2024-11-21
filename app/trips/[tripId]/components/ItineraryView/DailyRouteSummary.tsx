import { useMemo } from 'react';

import { differenceInDays, addDays } from 'date-fns';
import { Calendar } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

import { DayGroup } from './DayGroup';
import type { ParsedItineraryActivity, ParsedTrip } from '../../types';

interface DailyRouteSummaryProps {
  trip: ParsedTrip;
  activities: ParsedItineraryActivity[];
  onActivityHover: (activityId: string | null) => void;
  onActivitySelect: (activityId: string | null) => void;
  hoveredActivityId: string | null;
  selectedActivityId: string | null;
}

interface DayGroup {
  date: Date;
  dayNumber: number;
  activities: ParsedItineraryActivity[];
}

export function DailyRouteSummary({
  trip,
  activities,
  onActivityHover,
  onActivitySelect,
  hoveredActivityId,
  selectedActivityId,
}: DailyRouteSummaryProps) {
  // Group activities by day
  const groupedActivities = useMemo(() => {
    const totalDays = differenceInDays(trip.endDate, trip.startDate) + 1;
    const days: DayGroup[] = [];

    // Initialize day groups
    for (let i = 0; i < totalDays; i++) {
      const date = addDays(trip.startDate, i);
      days.push({
        date,
        dayNumber: i + 1,
        activities: [],
      });
    }

    // Sort activities into days
    activities.forEach(activity => {
      const activityDate = new Date(activity.startTime);
      const dayIndex = differenceInDays(activityDate, trip.startDate);
      if (dayIndex >= 0 && dayIndex < totalDays) {
        days[dayIndex].activities.push(activity);
      }
    });

    // Sort activities within each day by start time
    days.forEach(day => {
      day.activities.sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
    });

    return days;
  }, [activities, trip.startDate, trip.endDate]);

  // If no activities yet
  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Activities Planned</h3>
          <p className="text-gray-500 text-center mb-4">
            Start adding activities to build your itinerary
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {groupedActivities.map(day => (
        <DayGroup
          key={day.dayNumber}
          day={day}
          isFirst={day.dayNumber === 1}
          isLast={day.dayNumber === groupedActivities.length}
          onActivityHover={onActivityHover}
          onActivitySelect={onActivitySelect}
          hoveredActivityId={hoveredActivityId}
          selectedActivityId={selectedActivityId}
        />
      ))}
    </div>
  );
}
