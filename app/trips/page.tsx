import { auth } from '@clerk/nextjs/server';
import { Trip } from '@prisma/client';
import Link from 'next/link';

import { Container } from '@/components/layouts/container';
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-6">
          <h1 className="text-3xl font-bold">Your Trips</h1>
          <div className="flex items-center gap-4">
            <Link href="/trips/new">
              <Button>Create New Trip</Button>
            </Link>
          </div>
        </div>
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
