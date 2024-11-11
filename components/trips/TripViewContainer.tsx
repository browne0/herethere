// components/trips/TripViewContainer.tsx
'use client';

import React from 'react';

import { Activity, Trip } from '@prisma/client';
import { format } from 'date-fns';

import { Accommodation } from '@/lib/trips';

import { DailyRouteSummary } from './DailyRouteSummary';

interface TripViewContainerProps {
  trip: Trip;
  activities: Activity[];
  startDate: Date;
  endDate: Date;
  accommodation?: Accommodation;
}

export function TripViewContainer({
  trip,
  activities,
  startDate,
  endDate,
  accommodation,
}: TripViewContainerProps) {
  // State management
  const [selectedDate, setSelectedDate] = React.useState<string>(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const firstDay = format(startDate, 'yyyy-MM-dd');
    const lastDay = format(endDate, 'yyyy-MM-dd');

    // Default to today if it's within trip dates, otherwise first day
    if (today >= firstDay && today <= lastDay) {
      return today;
    }
    return firstDay;
  });

  const [hoveredActivityId, setHoveredActivityId] = React.useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = React.useState<string | null>(null);

  // Get all dates between start and end
  const tripDates = React.useMemo(() => {
    const dates: string[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(format(currentDate, 'yyyy-MM-dd'));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  }, [startDate, endDate]);

  // Handle date selection
  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedActivityId(null);
    setHoveredActivityId(null);
  };

  // Handle activity interactions
  const handleActivityHover = (activityId: string | null) => {
    setHoveredActivityId(activityId);
  };

  const handleActivitySelect = (activityId: string | null) => {
    setSelectedActivityId(activityId);
    if (activityId) {
      setHoveredActivityId(null);
    }
  };

  return (
    <div className="flex flex-1 min-h-0">
      {/* Daily Route Summary */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <DailyRouteSummary
          trip={trip}
          dates={tripDates}
          activities={activities}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          onActivityHover={handleActivityHover}
          onActivitySelect={handleActivitySelect}
          hoveredActivityId={hoveredActivityId}
          selectedActivityId={selectedActivityId}
          accommodation={accommodation}
        />
      </div>
    </div>
  );
}
