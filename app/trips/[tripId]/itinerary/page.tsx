import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/db';

import { ItineraryPageClient } from './ItineraryPageClient';
import { ParsedTrip } from '../types';

async function getTrip(tripId: string, userId: string) {
  const trip = await prisma.trip.findUnique({
    where: {
      id: tripId,
      userId,
    },
    include: {
      city: true,
      activities: {
        include: {
          recommendation: true,
        },
        orderBy: {
          startTime: 'asc',
        },
      },
    },
  });

  if (!trip) {
    redirect('/trips');
  }

  return trip;
}

export default async function ItineraryPage({ params }: { params: { tripId: string } }) {
  const { userId } = await auth();
  const { tripId } = await params;

  if (!userId) redirect('/sign-in');

  const trip = (await getTrip(tripId, userId)) as unknown as ParsedTrip;

  return <ItineraryPageClient initialTrip={trip} initialActivities={trip.activities} />;
}
