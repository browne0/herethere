import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/db';

import { TripPageClient } from './TripPageClient';
import { ParsedTrip } from './types';
import { fetchRestaurantRecommendations } from './utils';

export default async function TripPage({ params }: { params: { tripId: string } }) {
  const { userId } = await auth();
  const { tripId } = params;

  if (!userId) {
    redirect('/sign-in');
  }

  const [trip, userPreferences] = await Promise.all([
    // Get trip data
    prisma.trip.findUnique({
      where: {
        id: tripId,
        userId,
      },
      include: {
        activities: {
          include: {
            recommendation: true,
          },
          orderBy: {
            startTime: 'asc',
          },
        },
        city: true,
      },
    }),
    // Get user preferences
    prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    }),
  ]);

  if (!trip) {
    redirect('/trips');
  }

  // Fetch recommendations with preferences
  const restaurantShelf = await fetchRestaurantRecommendations({
    cityId: trip.city.id,
    userPreferences: userPreferences?.preferences || {},
    budget: trip.preferences.budget,
  });

  const shelves = [restaurantShelf];

  return <TripPageClient trip={trip as unknown as ParsedTrip} shelves={shelves} />;
}
