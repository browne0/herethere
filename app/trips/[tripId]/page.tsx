// app/trips/[tripId]/page.tsx
import { ComponentProps } from 'react';

import { auth } from '@clerk/nextjs/server';
import { format, differenceInDays } from 'date-fns';
import { CalendarDays, Plus, PencilIcon } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Container } from '@/components/layouts/container';
import { DeleteTripButton } from '@/components/trips/delete-trip-button';
import { TripActionsDropdown } from '@/components/trips/TripActionsDropdown';
import { TripShareDialog } from '@/components/trips/TripShareDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { prisma } from '@/lib/db';

type BadgeVariant = ComponentProps<typeof Badge>['variant'];

function getTripTimingText(
  startDate: Date,
  endDate: Date
): { text: string; variant: BadgeVariant } {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffHours = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60));
  const diffDays = Math.ceil(diffHours / 24);

  // If trip has ended
  if (now > end) {
    return { text: 'Past trip', variant: 'outline' };
  }

  // If trip is in progress
  if (now >= start && now <= end) {
    return { text: 'In progress', variant: 'secondary' };
  }

  // If trip is approaching
  if (diffHours <= 24) {
    if (diffHours <= 1) {
      return { text: 'Starting soon', variant: 'secondary' };
    }
    return { text: `In ${diffHours} hours`, variant: 'secondary' };
  }

  if (diffDays === 1) {
    return { text: 'Tomorrow', variant: 'secondary' };
  }

  return { text: `${diffDays} days away`, variant: 'secondary' };
}

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
    <Container size="md">
      <div className="space-y-8">
        {/* Trip Overview Card */}
        <Card className="bg-muted/50">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold">{trip.title}</h1>
                <p className="text-muted-foreground">{trip.destination}</p>
              </div>
              <Badge variant={tripTiming.variant}>{tripTiming.text}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label className="text-sm">Dates</Label>
                <p className="font-medium">
                  {isSingleDayTrip ? (
                    format(new Date(trip.startDate), 'MMMM d, yyyy')
                  ) : (
                    <>
                      {format(new Date(trip.startDate), 'MMM d')} -{' '}
                      {format(new Date(trip.endDate), 'MMM d, yyyy')}
                    </>
                  )}
                </p>
              </div>
              <div>
                <Label className="text-sm">Duration</Label>
                <p className="font-medium">
                  {isSingleDayTrip ? 'Single day' : `${tripDuration} days`}
                </p>
              </div>
              <div>
                <Label className="text-sm">Activities</Label>
                <p className="font-medium">
                  {trip.activities.length}
                  {trip.activities.length === 1 ? ' activity' : ' activities'} planned
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 items-center">
          <Button asChild>
            <Link href={`/trips/${trip.id}/activities/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Add Activity
            </Link>
          </Button>

          <div className="flex gap-2">
            <TripShareDialog trip={trip} activityCount={trip.activities.length} />
            <Button asChild variant="outline">
              <Link href={`/trips/${trip.id}/edit`}>
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit Trip
              </Link>
            </Button>
            <TripActionsDropdown trip={trip}></TripActionsDropdown>
          </div>

          <div className="ml-auto">
            <DeleteTripButton tripId={trip.id} />
          </div>
        </div>

        {/* Activities Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Trip Itinerary</CardTitle>
          </CardHeader>
          <CardContent>
            {trip.activities.length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-lg">
                <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Plan Your {isSingleDayTrip ? 'Day' : 'Trip'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  Add activities to build your {isSingleDayTrip ? 'day trip' : 'travel'} itinerary
                </p>
                <Button asChild>
                  <Link href={`/trips/${trip.id}/activities/new`}>Add First Activity</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-8">
                {isSingleDayTrip ? (
                  // Single day layout - no date headers needed
                  <div className="space-y-4">
                    {trip.activities.map(activity => (
                      <div key={activity.id} className="relative pl-6 border-l-2 border-gray-200">
                        <div className="absolute left-[-5px] top-3 w-2 h-2 rounded-full bg-primary" />
                        <div className="border rounded-lg p-4 hover:border-primary/50 transition-colors">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{activity.name}</h3>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <p>
                                  {format(new Date(activity.startTime), 'h:mm a')} -{' '}
                                  {format(new Date(activity.endTime), 'h:mm a')}
                                </p>
                                <Badge variant="secondary">{activity.type}</Badge>
                              </div>
                              {activity.address && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {activity.address}
                                </p>
                              )}
                              {activity.notes && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  {activity.notes}
                                </p>
                              )}
                            </div>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/trips/${trip.id}/activities/${activity.id}`}>
                                View Details
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Multi-day layout - with date grouping
                  Object.entries(groupedActivities).map(([date, activities]) => (
                    <div key={date}>
                      <h3 className="font-semibold text-lg mb-4">
                        {format(new Date(date), 'EEEE, MMMM d')}
                      </h3>
                      <div className="space-y-4">
                        {activities.map(activity => (
                          <div
                            key={activity.id}
                            className="relative pl-6 border-l-2 border-gray-200"
                          >
                            <div className="absolute left-[-5px] top-3 w-2 h-2 rounded-full bg-primary" />
                            <div className="border rounded-lg p-4 hover:border-primary/50 transition-colors">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="font-medium">{activity.name}</h3>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <p>
                                      {format(new Date(activity.startTime), 'h:mm a')} -{' '}
                                      {format(new Date(activity.endTime), 'h:mm a')}
                                    </p>
                                    <Badge variant="secondary">{activity.type}</Badge>
                                  </div>
                                  {activity.address && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {activity.address}
                                    </p>
                                  )}
                                  {activity.notes && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                      {activity.notes}
                                    </p>
                                  )}
                                </div>
                                <Button variant="ghost" size="sm" asChild>
                                  <Link href={`/trips/${trip.id}/activities/${activity.id}`}>
                                    View Details
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
