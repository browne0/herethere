import { auth } from '@clerk/nextjs/server';
import { Trip } from '@prisma/client';
import { format } from 'date-fns';
import Link from 'next/link';

import { Container } from '@/components/layouts/container';
import { PlacePhotos } from '@/components/places/PlacePhotos';
import { Button } from '@/components/ui/button';
import { prisma } from '@/lib/db';

export default async function TripsPage() {
  const { userId } = await auth();

  if (!userId) return null;

  const trips = await prisma.trip.findMany({
    where: {
      userId,
    },
    orderBy: {
      startDate: 'desc',
    },
  });

  return (
    <Container>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Your Trips</h1>
        <Button asChild>
          <Link href="/trips/new">Create New Trip</Link>
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {trips.map((trip: Trip) => (
          <Link key={trip.id} href={`/trips/${trip.id}`} className="group block">
            <div className="flex rounded-lg overflow-hidden border hover:shadow-lg transition-shadow bg-white">
              <div className="flex-1 p-6">
                <h2 className="text-xl font-semibold mb-2">{trip.title}</h2>
                <p className="text-muted-foreground mb-3">{trip.destination}</p>
                <div className="text-sm text-muted-foreground">
                  <p>
                    {format(new Date(trip.startDate), 'MMM d, yyyy')} -{' '}
                    {format(new Date(trip.endDate), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
              <div className="relative w-[200px] h-[200px]">
                {trip.placeId ? (
                  <PlacePhotos placeId={trip.placeId} className="!absolute inset-0" maxPhotos={1} />
                ) : (
                  <div className="absolute inset-0 bg-muted flex items-center justify-center">
                    <p className="text-muted-foreground">No photo</p>
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
        {trips.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <h3 className="text-lg font-medium mb-2">No trips planned yet</h3>
            <p className="text-muted-foreground mb-6">Create your first trip to get started</p>
            <Button asChild>
              <Link href="/trips/new">Create New Trip</Link>
            </Button>
          </div>
        )}
      </div>
    </Container>
  );
}
