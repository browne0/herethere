import { auth } from '@clerk/nextjs/server';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/db';

import { ParsedTrip } from './[tripId]/types';
import { TripsList } from './components/TripsList';
import { baseMetadata } from '../lib/metadata';

export default async function TripsPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      onboardingCompleted: true,
    },
  });

  if (!user?.onboardingCompleted) {
    redirect('/onboarding/interests');
  }

  const trips = await prisma.trip.findMany({
    where: { userId },
    orderBy: { startDate: 'asc' },
    include: {
      activities: true,
      city: true,
    },
  });

  return <TripsList initialTrips={trips as unknown as ParsedTrip[]} />;
}

export const metadata: Metadata = {
  ...baseMetadata,
};
