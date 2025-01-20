import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/db';

import { tripService } from '@/app/api/services/trips';
import { Metadata } from 'next';
import { ParsedTrip } from '../types';
import { ItineraryPageClient } from './ItineraryPageClient';

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

export async function generateMetadata({
  params,
}: {
  params: { tripId: string };
}): Promise<Metadata> {
  try {
    const { userId } = await auth();
    const { tripId } = await params;
    if (!userId) {
      return {
        title: 'Trip',
      };
    }

    const trip = await tripService.getTrip({
      userId,
      tripId,
      include: ['city'],
    });

    return {
      title: `${trip.title} | Itinerary`,
      description: `Your trip to ${trip.city.name} from ${new Date(
        trip.startDate
      ).toLocaleDateString()} to ${new Date(trip.endDate).toLocaleDateString()}`,
    };
  } catch (_error) {
    return {
      title: 'Itinerary',
    };
  }
}
