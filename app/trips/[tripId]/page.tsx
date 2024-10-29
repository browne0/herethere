// app/trips/[tripId]/page.tsx

import { auth } from '@clerk/nextjs/server';
import { format, differenceInDays } from 'date-fns';
import { CalendarDays, Plus, MapPin, Route, Clock, Share2 } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ActivityCard } from '@/components/activities/ActivityCard';
import { DeleteTripButton } from '@/components/trips/delete-trip-button';
import { TripHeader } from '@/components/trips/TripHeader';
import { TripMapView } from '@/components/trips/TripMapView';
import { TripShareDialog } from '@/components/trips/TripShareDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/db';
import { getTripTimingText } from '@/lib/utils';

export default async function TripDetailsPage({ params }: { params: { tripId: string } }) {
  const { userId } = await auth();
  const { tripId } = params;

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
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left Panel - Trip Details */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {/* Header */}
        <TripHeader trip={trip} />

        {/* Main Content */}
        <div className="px-4 lg:px-8 py-6 space-y-6">
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-4 items-center">
            <Button asChild>
              <Link href={`/trips/${trip.id}/activities/new`}>
                <Plus className="h-4 w-4 mr-2" />
                Add Activity
              </Link>
            </Button>

            <TripShareDialog
              trip={trip}
              activityCount={trip.activities.length}
              trigger={
                <Button variant="outline">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Trip
                </Button>
              }
            />

            <DeleteTripButton tripId={trip.id} />
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
            </CardContent>
          </Card>

          {/* Features Card */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle>Trip Features</CardTitle>
              <CardDescription>Tools to help you plan and organize your trip</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 bg-background rounded-lg">
                  <Route className="w-8 h-8 text-indigo-600" />
                  <div>
                    <p className="font-medium">Route Planning</p>
                    <p className="text-sm text-muted-foreground">Optimize your daily routes</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-background rounded-lg">
                  <Clock className="w-8 h-8 text-purple-600" />
                  <div>
                    <p className="font-medium">Time Management</p>
                    <p className="text-sm text-muted-foreground">Balance your schedule</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-background rounded-lg">
                  <Share2 className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="font-medium">Trip Sharing</p>
                    <p className="text-sm text-muted-foreground">Collaborate with others</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Panel - Map */}
      <div className="hidden lg:block w-[45%] border-l">
        <TripMapView tripId={tripId} />
      </div>
    </div>
  );
}
