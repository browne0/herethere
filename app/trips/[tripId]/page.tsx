import { auth } from '@clerk/nextjs/server';
import { format } from 'date-fns';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Container } from '@/components/layouts/container';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/db';

export default async function TripDetailsPage({ params }: { params: { tripId: string } }) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const trip = await prisma.trip.findUnique({
    where: {
      id: params.tripId,
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">{trip.title}</h1>
          <p className="text-muted-foreground">
            {format(new Date(trip.startDate), 'MMM d')} -{' '}
            {format(new Date(trip.endDate), 'MMM d, yyyy')}
          </p>
        </div>
        <Button asChild>
          <Link href={`/trips/${trip.id}/edit`}>Edit Trip</Link>
        </Button>
      </div>

      <div className="grid gap-6">
        <div className="border rounded-lg p-6 bg-white">
          <h2 className="text-xl font-semibold mb-4">Destination</h2>
          <p>{trip.destination}</p>
        </div>

        <div className="border rounded-lg p-6 bg-white">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Activities</h2>
            <Button asChild variant="outline" size="sm">
              <Link href={`/trips/${trip.id}/activities/new`}>Add Activity</Link>
            </Button>
          </div>
          {trip.activities.length === 0 ? (
            <p className="text-muted-foreground">No activities planned yet.</p>
          ) : (
            <div className="space-y-4">
              {trip.activities.map(activity => (
                <div key={activity.id} className="border rounded p-4">
                  <h3 className="font-medium">{activity.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(activity.startTime), 'MMM d, h:mm a')} -{' '}
                    {format(new Date(activity.endTime), 'h:mm a')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
