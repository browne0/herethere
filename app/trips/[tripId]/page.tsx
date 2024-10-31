import { Suspense } from 'react';

import { auth } from '@clerk/nextjs/server';
import { format, differenceInDays } from 'date-fns';
import { CalendarDays, Plus, MapPin, Route, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ActivityCard } from '@/components/activities/ActivityCard';
import { DeleteTripButton } from '@/components/trips/delete-trip-button';
import { TripActionsDropdown } from '@/components/trips/TripActionsDropdown';
import TripGenerationError from '@/components/trips/TripGenerationError';
import { TripGenerationProgress } from '@/components/trips/TripGenerationProgress';
import { TripHeader } from '@/components/trips/TripHeader';
import { TripMapView } from '@/components/trips/TripMapView';
import { TripShareDialog } from '@/components/trips/TripShareDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/db';
import { MAX_RETRY_ATTEMPTS } from '@/lib/trip-generation/utils';
import { ErrorCode, TripHeaderProps, TripPreferences } from '@/lib/types';
import { getTripTimingText } from '@/lib/utils';

import { AutoRefresh } from './AutoRefresh';

function convertDbTripToProps(dbTrip: any): TripHeaderProps['trip'] {
  return {
    id: dbTrip.id,
    destination: dbTrip.destination,
    title: dbTrip.title,
    placeId: dbTrip.placeId,
    startDate: dbTrip.startDate,
    endDate: dbTrip.endDate,
    preferences: dbTrip.preferences as TripPreferences, // Type assertion here is safe because we validate the structure
  };
}

function MapLoadingFallback() {
  return (
    <div className="h-full flex items-center justify-center bg-muted/20">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    </div>
  );
}

// Main page component
export default async function TripDetailsPage({ params }: { params: { tripId: string } }) {
  const { userId } = await auth();
  const { tripId } = await params;

  if (!userId) {
    redirect('/sign-in');
  }

  const trip = await prisma.trip.findUnique({
    where: {
      id: tripId,
      userId,
    },
    include: {
      activities: {
        orderBy: {
          startTime: 'asc',
        },
      },
    },
  });

  if (!trip) {
    redirect('/trips');
  }

  const tripDuration = differenceInDays(new Date(trip.endDate), new Date(trip.startDate)) + 1;
  const isSingleDayTrip = tripDuration === 1;
  const tripTiming = getTripTimingText(trip.startDate, trip.endDate);
  const tripProps = convertDbTripToProps(trip);

  // Show error state if trip has an error
  if (trip.status === 'error') {
    return (
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        <div className="flex-1 min-w-0 overflow-y-auto">
          <TripHeader trip={tripProps} />
          <TripGenerationError
            tripId={trip.id}
            error={{
              code: trip.errorCode as ErrorCode,
              message: trip.errorMessage || 'An error occurred',
              recoverable: trip.attemptsCount < MAX_RETRY_ATTEMPTS,
              details:
                trip.errorCode === 'TIMEOUT_ERROR'
                  ? 'The trip generation process took longer than expected.'
                  : undefined,
            }}
          />
        </div>
      </div>
    );
  }

  // Show loading state if trip is not complete
  if (trip.status !== 'complete') {
    return (
      <AutoRefresh status={trip.status}>
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
          <div className="flex-1 min-w-0 overflow-y-auto">
            <TripHeader trip={tripProps} />
            <TripGenerationProgress progress={trip.progress} status={trip.status} />
          </div>
          <div className="hidden lg:block w-[45%] border-l">
            <TripMapView tripId={tripId} />
          </div>
        </div>
      </AutoRefresh>
    );
  }

  // Group activities by date
  const groupedActivities = trip.activities.reduce(
    (groups, activity) => {
      const date = format(new Date(activity.startTime), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
      return groups;
    },
    {} as Record<string, typeof trip.activities>
  );

  return (
    <AutoRefresh status={trip.status}>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Left Panel - Trip Details */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {/* Header */}
          <TripHeader trip={tripProps} />

          {/* Main Content */}
          <div className="px-4 lg:px-8 py-6 space-y-6">
            {/* Quick Actions */}
            <div className="flex flex-wrap justify-between items-center">
              <div className="flex flex-wrap gap-4 items-center">
                <Button asChild>
                  <Link href={`/trips/${trip.id}/activities/new`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Activity
                  </Link>
                </Button>

                <TripShareDialog trip={trip} activityCount={trip.activities?.length || 0} />

                <DeleteTripButton tripId={trip.id} />
              </div>

              <TripActionsDropdown trip={trip} />
            </div>

            {/* Trip Stats */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-medium">
                    <MapPin className="h-4 w-4 text-primary" />
                    Total Activities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{trip.activities.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {(trip.activities.length / tripDuration).toFixed(1)} per day
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-medium">
                    <Clock className="h-4 w-4 text-primary" />
                    Trip Duration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {tripDuration} {tripDuration === 1 ? 'Day' : 'Days'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(trip.startDate), 'MMM d')} -{' '}
                    {format(new Date(trip.endDate), 'MMM d')}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-medium">
                    <Route className="h-4 w-4 text-primary" />
                    Trip Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    <Badge variant={tripTiming.variant}>{tripTiming.text}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last updated {format(new Date(trip.updatedAt), 'MMM d')}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Activities Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Trip Itinerary
                  <Badge variant={tripTiming.variant}>{tripTiming.text}</Badge>
                </CardTitle>
                <CardDescription>Your planned activities for this trip</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  }
                >
                  {trip.activities.length === 0 ? (
                    <div className="text-center py-12 bg-muted/20 rounded-lg">
                      <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">
                        Plan Your {isSingleDayTrip ? 'Day' : 'Trip'}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Start adding activities to build your itinerary
                      </p>
                      <Button asChild>
                        <Link href={`/trips/${trip.id}/activities/new`}>Add First Activity</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {isSingleDayTrip ? (
                        <div className="space-y-4">
                          {trip.activities.map(activity => (
                            <ActivityCard
                              key={activity.id}
                              activity={activity}
                              href={`/trips/${trip.id}/activities/${activity.id}`}
                            />
                          ))}
                        </div>
                      ) : (
                        Object.entries(groupedActivities).map(([date, activities]) => (
                          <div key={date}>
                            <h3 className="flex items-center font-semibold text-lg mb-4">
                              <CalendarDays className="h-5 w-5 mr-2 text-primary" />
                              {format(new Date(date), 'EEEE, MMMM d')}
                            </h3>
                            <div className="space-y-4 ml-7">
                              {activities.map(activity => (
                                <ActivityCard
                                  key={activity.id}
                                  activity={activity}
                                  href={`/trips/${trip.id}/activities/${activity.id}`}
                                />
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </Suspense>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Panel - Map */}
        <div className="hidden lg:block w-[45%] border-l">
          <Suspense fallback={<MapLoadingFallback />}>
            <TripMapView tripId={tripId} />
          </Suspense>
        </div>
      </div>
    </AutoRefresh>
  );
}
