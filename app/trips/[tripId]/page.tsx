// app/trips/[tripId]/page.tsx
import { Suspense } from 'react';

import { auth } from '@clerk/nextjs/server';
import { format, differenceInDays } from 'date-fns';
import { Plus, MapPin, Route, Clock } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { DeleteTripButton } from '@/components/trips/DeleteTripButton';
import { MapSection } from '@/components/trips/MapSection';
import { TripActionsDropdown } from '@/components/trips/TripActionsDropdown';
import { TripHeader } from '@/components/trips/TripHeader';
import { TripShareDialog } from '@/components/trips/TripShareDialog';
import { TripViewContainer } from '@/components/trips/TripViewContainer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/db';
import { TripHeaderProps, TripPreferences } from '@/lib/types';
import { getTripTimingText } from '@/lib/utils';

function convertDbTripToProps(dbTrip: any): TripHeaderProps['trip'] {
  return {
    id: dbTrip.id,
    destination: dbTrip.destination,
    title: dbTrip.title,
    placeId: dbTrip.placeId,
    startDate: dbTrip.startDate,
    endDate: dbTrip.endDate,
    preferences: dbTrip.preferences as TripPreferences,
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
  const tripTiming = getTripTimingText(trip.startDate, trip.endDate);
  const tripProps = convertDbTripToProps(trip);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left Panel - Trip Details */}
      <div className="w-1/2 overflow-y-auto">
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

          {/* Trip View Container with Daily Routes and Map */}
          <Suspense fallback={<MapLoadingFallback />}>
            <TripViewContainer
              trip={trip}
              activities={trip.activities}
              startDate={new Date(trip.startDate)}
              endDate={new Date(trip.endDate)}
              accommodation={trip.preferences?.accommodation}
            />
          </Suspense>
        </div>
      </div>
      {/* <div className="w-1/2 border-l">
        <Suspense fallback={<MapLoadingFallback />}>
          <MapSection
            tripId={tripId}
            activities={trip.activities}
            accommodation={trip.preferences?.accommodation}
          />
        </Suspense>
      </div> */}
    </div>
  );
}
