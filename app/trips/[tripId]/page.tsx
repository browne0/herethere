// app/trips/[tripId]/page.tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { restaurantRecommendationService } from '@/app/api/services/recommendations/restaurants';
import { prisma } from '@/lib/db';

import { TripPageClient } from './TripPageClient';

export default async function TripPage({ params }: { params: { tripId: string } }) {
  const { userId } = await auth();
  const { tripId } = await params;
  if (!userId) {
    redirect('/sign-in');
  }

  // Get both trip and user data
  const [trip, user] = await Promise.all([
    prisma.trip.findFirst({
      where: {
        id: tripId,
        userId,
      },
      include: {
        activities: {
          include: {
            recommendation: true,
          },
        },
        city: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        preferences: true,
      },
    }),
  ]);

  if (!trip) {
    redirect('/trips');
  }

  // Get restaurant recommendations directly using the service
  const restaurantRecommendations = await restaurantRecommendationService.getRecommendations(
    trip.city.id,
    {
      pricePreference: user?.preferences?.pricePreference,
      dietaryRestrictions: user?.preferences?.dietaryRestrictions,
      cuisinePreferences: user?.preferences?.cuisinePreferences,
      mealImportance: user?.preferences?.mealImportance,
      transportPreferences: user?.preferences?.transportPreferences,
      crowdPreference: user?.preferences?.crowdPreference,
      budget: trip.preferences?.budget,
      currentLocation: {
        lat: trip.city.latitude,
        lng: trip.city.longitude,
      },
    }
  );

  // Format recommendations into a shelf
  const restaurantShelf = {
    type: 'restaurants',
    title: 'Recommended Restaurants',
    activities: restaurantRecommendations,
  };

  const shelves = [restaurantShelf];

  return <TripPageClient trip={trip} shelves={shelves} />;
}
