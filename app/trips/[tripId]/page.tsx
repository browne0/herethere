import { auth } from '@clerk/nextjs/server';
import { format } from 'date-fns';
import { CalendarDays, MapPin } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Container } from '@/components/layouts/container';
import { DeleteTripButton } from '@/components/trips/delete-trip-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/db';

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

  return (
    <Container size="md">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">{trip.title}</h1>
          <div className="flex items-center text-muted-foreground">
            <MapPin className="w-4 h-4 mr-2" />
            {trip.destination}
          </div>
        </div>
        <div className="flex gap-4">
          <Button asChild variant="outline">
            <Link href={`/trips/${trip.id}/edit`}>Edit Trip</Link>
          </Button>
          <DeleteTripButton tripId={trip.id} />
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
              <div className="space-y-4">
                {trip.activities.map(activity => (
                  <div key={activity.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{activity.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(activity.startTime), 'h:mm a')} -{' '}
                          {format(new Date(activity.endTime), 'h:mm a')}
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
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
