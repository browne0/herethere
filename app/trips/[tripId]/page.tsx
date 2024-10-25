import { auth } from '@clerk/nextjs/server';
import { Activity } from '@prisma/client';
import { addDays, differenceInDays, format, isSameDay, parseISO } from 'date-fns';
import { CalendarDays, MapPin, Clock, Calendar } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Container } from '@/components/layouts/container';
import { DeleteTripButton } from '@/components/trips/delete-trip-button';
import { TripActionsDropdown } from '@/components/trips/TripActionsDropdown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { prisma } from '@/lib/db';

function groupActivitiesByDate(activities: Activity[]) {
  const grouped = new Map<string, Activity[]>();

  activities.forEach(activity => {
    const date = format(new Date(activity.startTime), 'yyyy-MM-dd');
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push(activity);
  });

  // Sort activities within each day by start time
  grouped.forEach(activities => {
    activities.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  });

  return grouped;
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
      activities: true,
    },
  });

  if (!trip) {
    redirect('/trips');
  }

  const tripDuration = differenceInDays(new Date(trip.endDate), new Date(trip.startDate)) + 1;
  const groupedActivities = groupActivitiesByDate(trip.activities);
  const activityDays = Array.from({ length: tripDuration }, (_, i) =>
    addDays(new Date(trip.startDate), i)
  );

  return (
    <Container size="md">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">{trip.title}</h1>
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              {trip.destination}
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              {tripDuration} {tripDuration === 1 ? 'day' : 'days'}
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              {trip.activities.length} {trip.activities.length === 1 ? 'activity' : 'activities'}
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <Button asChild variant="outline">
            <Link href={`/trips/${trip.id}/edit`}>Edit Trip</Link>
          </Button>
          <DeleteTripButton tripId={trip.id} />
          <TripActionsDropdown trip={trip} />
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center text-muted-foreground mb-1">
              <CalendarDays className="w-4 h-4 mr-2" />
              Trip Dates
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-muted-foreground">Start Date</div>
                <div className="font-medium">
                  {format(new Date(trip.startDate), 'EEEE, MMMM d, yyyy')}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">End Date</div>
                <div className="font-medium">
                  {format(new Date(trip.endDate), 'EEEE, MMMM d, yyyy')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Activities</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href={`/trips/${trip.id}/activities/new`}>Add Activity</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {trip.activities.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No activities planned yet.</p>
                <Button asChild>
                  <Link href={`/trips/${trip.id}/activities/new`}>Plan Your First Activity</Link>
                </Button>
              </div>
            ) : (
              <Tabs defaultValue="timeline">
                <TabsList>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="byDay">By Day</TabsTrigger>
                </TabsList>

                <TabsContent value="timeline" className="space-y-6">
                  {Array.from(groupedActivities.entries()).map(([date, activities]) => (
                    <div key={date}>
                      <h3 className="font-semibold mb-4">
                        {format(parseISO(date), 'EEEE, MMMM d')}
                      </h3>
                      <div className="space-y-4">
                        {activities.map(activity => (
                          <div
                            key={activity.id}
                            className="relative pl-6 border-l-2 border-gray-200"
                          >
                            <div className="absolute left-[-5px] top-3 w-2 h-2 rounded-full bg-primary" />
                            <div className="border rounded-lg p-4">
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
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {activity.address}
                                  </p>
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
                  ))}
                </TabsContent>

                <TabsContent value="byDay">
                  <div className="space-y-6">
                    {activityDays.map(day => {
                      const dayActivities = trip.activities.filter(activity =>
                        isSameDay(new Date(activity.startTime), day)
                      );

                      return (
                        <div key={day.toISOString()}>
                          <h3 className="font-semibold mb-4">{format(day, 'EEEE, MMMM d')}</h3>
                          {dayActivities.length === 0 ? (
                            <div className="text-center py-4 border rounded-lg">
                              <p className="text-muted-foreground">No activities planned</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {dayActivities.map(activity => (
                                <div key={activity.id} className="border rounded-lg p-4">
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
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {activity.address}
                                      </p>
                                    </div>
                                    <Button variant="ghost" size="sm" asChild>
                                      <Link href={`/trips/${trip.id}/activities/${activity.id}`}>
                                        View Details
                                      </Link>
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
