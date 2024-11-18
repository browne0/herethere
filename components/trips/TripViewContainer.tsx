// components/trips/TripViewContainer.tsx
'use client';

import React from 'react';

import { format } from 'date-fns';

import { DailyRouteSummary } from './DailyRouteSummary';

interface TripViewContainerProps {
  startDate: Date;
  endDate: Date;
}

export function TripViewContainer({ startDate, endDate }: TripViewContainerProps) {
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
          onActivityHover={handleActivityHover}
          onActivitySelect={handleActivitySelect}
          hoveredActivityId={hoveredActivityId}
          selectedActivityId={selectedActivityId}
        />
      </div>
    </div>
  );
}
