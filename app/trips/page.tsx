import { auth } from '@clerk/nextjs/server';
import { Trip } from '@prisma/client';
import { format } from 'date-fns';
import Link from 'next/link';

import { Container } from '@/components/layouts/container';
import { PlacePhotos } from '@/components/places/PlacePhotos';
import { TripCard } from '@/components/trips/TripCard';
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
          <TripCard key={trip.id} trip={trip} />
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
