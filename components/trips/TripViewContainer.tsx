// components/trips/TripViewContainer.tsx
'use client';

import React from 'react';

import { Activity } from '@prisma/client';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

import { Accommodation } from '@/lib/trips';

import { DailyRouteSummary } from './DailyRouteSummary';
import { TripMapView } from './TripMapView';
import { Card } from '../ui/card';

// Type definitions

interface RouteSegment {
  distance: string;
  duration: string;
  startActivity: Activity;
  endActivity: Activity;
}

interface TripViewContainerProps {
  tripId: string;
  activities: Activity[];
  startDate: Date;
  endDate: Date;
  accommodation?: Accommodation;
}

interface DayActivities {
  date: string;
  activities: Activity[];
  routeSegments?: RouteSegment[];
}

export function TripViewContainer({
  tripId,
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
  const [isLoadingRoutes, setIsLoadingRoutes] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
    return groups;
  }, [activities]);

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

  // Get activities for selected date
  const selectedDateActivities = React.useMemo(() => {
    return groupedActivities[selectedDate] || [];
  }, [groupedActivities, selectedDate]);

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

  // Error handling
  if (error) {
    return (
      <Card className="p-6 bg-destructive/10">
        <p className="text-destructive">{error}</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-1 min-h-0">
      {/* Daily Route Summary */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <DailyRouteSummary
          dates={tripDates}
          activities={activities}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          onActivityHover={handleActivityHover}
          onActivitySelect={handleActivitySelect}
          hoveredActivityId={hoveredActivityId}
          selectedActivityId={selectedActivityId}
          accommodation={accommodation}
          isLoadingRoutes={isLoadingRoutes}
        />
      </div>

      {/* Map View */}
      <div className="hidden lg:block w-[45%] border-l relative">
        {isLoadingRoutes && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Calculating routes...</p>
            </div>
          </div>
        )}
        <TripMapView
          tripId={tripId}
          activities={selectedDateActivities}
          onMarkerHover={handleActivityHover}
          onMarkerSelect={handleActivitySelect}
          hoveredActivityId={hoveredActivityId}
          selectedActivityId={selectedActivityId}
          accommodation={accommodation}
          date={selectedDate}
        />
      </div>
    </div>
  );
}
