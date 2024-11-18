import React from 'react';

import { format } from 'date-fns';
import { Loader2, MapPin, ChevronDown } from 'lucide-react';

import { ProcessedActivity } from '@/contexts/TripActivitiesContext';
import { cn } from '@/lib/utils';

import { ActivityCategoryBadge } from './ActivityDetails';
import TimeDisplay from '../trips/TimeDisplay';

// Activity Card Component
const ActivityCard = React.memo(
  ({
    activity,
    timeZone,
    isLastActivity,
  }: {
    activity: ProcessedActivity;
    timeZone: string;
    isLastActivity: boolean;
  }) => (
    <div className="relative group">
      {/* Left Timeline */}
      {!isLastActivity && <div className="absolute left-[11px] top-0 bottom-0 w-px bg-gray-100" />}

      {/* Timeline Dot */}
      <div className="absolute left-[7px] top-6 w-[9px] h-[9px] rounded-full bg-gray-200" />

      {/* Activity Content */}
      <div
        className={cn(
          'ml-8 py-6 px-6 transition-all duration-200',
          'border-b border-gray-50 relative',
          activity.error && 'bg-destructive/5'
        )}
      >
        {activity.isProcessing && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-10">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="flex items-center gap-2 bg-white/80 px-3 py-2 rounded-full shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-gray-600">Finding location...</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Top Row - Category & Time */}
          <div className="flex items-center justify-between gap-4">
            <ActivityCategoryBadge category={activity.category} />
            <TimeDisplay
              timeZone={timeZone}
              startTime={activity.startTime}
              endTime={activity.endTime}
            />
          </div>

          {/* Title & Location/Error */}
          <div className="space-y-2">
            <h4 className="text-lg font-medium leading-tight">{activity.name}</h4>
            {activity.error ? (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <span>{activity.error}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="line-clamp-1 animate-pulse bg-gray-100 rounded-full h-4 w-48" />
              </div>
            )}
          </div>

          {/* Loading Placeholder for Next Location */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-full h-4 bg-gray-100 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
);

ActivityCard.displayName = 'ActivityCard';

// Day Group Component
const DayGroup = React.memo(
  ({
    dayNumber,
    // date,
    activities,
    timeZone,
  }: {
    dayNumber: number;
    // date: Date;
    activities: ProcessedActivity[];
    timeZone: string;
  }) => (
    <div className="bg-white rounded-xl">
      {/* Day Header */}
      <div className="w-full px-6 py-4 flex items-center gap-3 rounded-xl text-left">
        <div className="p-2 rounded-lg bg-primary/10">
          <ChevronDown className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <span className="font-medium">
            {dayNumber === 1 ? 'Arrival Day' : `Day ${dayNumber}`}
          </span>
          {/* <span className="text-gray-500 ml-2">{format(date, 'MMM d')}</span> */}
        </div>
        <span className="text-sm text-gray-500">{activities.length} activities</span>
      </div>

      {/* Activities */}
      <div className="pt-2 pb-4">
        {activities.map((activity, index) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            timeZone={timeZone}
            isLastActivity={index === activities.length - 1}
          />
        ))}
      </div>
    </div>
  )
);

DayGroup.displayName = 'DayGroup';

// Main Component
export default function GeneratingActivityList({
  activities,
  timeZone,
  startDate,
}: {
  activities: ProcessedActivity[];
  timeZone: string;
  startDate: Date;
}) {
  // Group activities by day
  const groupedActivities = activities.reduce<Record<number, ProcessedActivity[]>>(
    (acc, activity) => {
      const dayNumber = activity.dayNumber;
      if (!acc[dayNumber]) {
        acc[dayNumber] = [];
      }
      acc[dayNumber].push(activity);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-6">
      {Object.entries(groupedActivities).map(([dayNumber, dayActivities]) => {
        const dayNumberInt = parseInt(dayNumber);
        // const date = new Date(startDate);
        // date.setDate(date.getDate() + dayNumberInt - 1);

        return (
          <DayGroup
            key={dayNumber}
            dayNumber={dayNumberInt}
            // date={date}
            activities={dayActivities}
            timeZone={timeZone}
          />
        );
      })}
    </div>
  );
}
