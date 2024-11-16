'use client';
import { differenceInDays, format } from 'date-fns';
import { Clock, MapPin, Route } from 'lucide-react';

import { useTripActivities } from '@/contexts/TripActivitiesContext';
import { getTripTimingText } from '@/lib/utils';

import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export function TripStats() {
  const { trip, activities, isGenerating, generatedActivities } = useTripActivities();
  const tripDuration = differenceInDays(new Date(trip.endDate), new Date(trip.startDate)) + 1;
  const timing = getTripTimingText(trip.startDate, trip.endDate);

  const getExpectedActivitiesPerDay = () => {
    const tripVibe = trip.preferences?.tripVibe || 50;
    return tripVibe > 75
      ? 6 // Adventurous
      : tripVibe > 25
        ? 5 // Balanced
        : 4; // Relaxed
  };

  const expectedTotal = tripDuration * getExpectedActivitiesPerDay();
  const currentTotal = isGenerating ? generatedActivities.length : activities.length;
  const activitiesPerDay = isGenerating
    ? getExpectedActivitiesPerDay()
    : (activities.length / tripDuration).toFixed(1);

  return (
    <div className="grid gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-2 px-4 lg:px-6">
          <CardTitle className="flex items-center gap-2 text-sm lg:text-base font-medium">
            <MapPin className="h-4 w-4 text-primary" />
            Total Activities
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 lg:px-6">
          <div className="text-xl lg:text-2xl font-bold">
            {isGenerating ? (
              <span>
                {currentTotal} / {expectedTotal}
              </span>
            ) : (
              currentTotal
            )}
          </div>
          <p className="text-xs text-muted-foreground">{activitiesPerDay} per day</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 px-4 lg:px-6">
          <CardTitle className="flex items-center gap-2 text-sm lg:text-base font-medium">
            <Clock className="h-4 w-4 text-primary" />
            Trip Duration
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 lg:px-6">
          <div className="text-xl lg:text-2xl font-bold">
            {tripDuration} {tripDuration === 1 ? 'Day' : 'Days'}
          </div>
          <p className="text-xs text-muted-foreground">
            {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 px-4 lg:px-6">
          <CardTitle className="flex items-center gap-2 text-sm lg:text-base font-medium">
            <Route className="h-4 w-4 text-primary" />
            Trip Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xl lg:text-2xl font-bold">
            <Badge variant={timing.variant}>{timing.text}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Last updated {format(new Date(trip.updatedAt), 'MMM d')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
