// app/trips/[tripId]/page.tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { essentialExperiencesRecommendationService } from '@/app/api/services/recommendations/essentialExperiences';
import { restaurantRecommendationService } from '@/app/api/services/recommendations/restaurants';
import { touristAttractionService } from '@/app/api/services/recommendations/touristAttractions';
import { prisma } from '@/lib/db';

import { TripPageClient } from './TripPageClient';
import { ParsedTrip } from './types';

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

  const recommendationsData = {
    cityId: trip.city.id,
    preferences: {
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
    },
  };

  // Get restaurant recommendations directly using the service
  const restaurantRecommendations = await restaurantRecommendationService.getRecommendations(
    recommendationsData.cityId,
    recommendationsData.preferences
  );

  const essentialExperiencesRecommendations =
    await essentialExperiencesRecommendationService.getRecommendations(
      recommendationsData.cityId,
      recommendationsData.preferences
    );

  const touristAttractionRecommendations = await touristAttractionService.getRecommendations(
    recommendationsData.cityId,
    {
      ...recommendationsData.preferences,
      interests: user?.preferences?.interests,
      energyLevel: user?.preferences?.energyLevel,
    }
  );

  // Format recommendations into a shelf
  const mustSeeShelf = {
    type: 'must-see',
    title: `Must See in ${trip.city.name}`,
    description: 'Essential experiences and notable attractions',
    activities: essentialExperiencesRecommendations,
  };

  const restaurantShelf = {
    type: 'restaurants',
    description: 'Curated dining picks just for you',
    title: 'Top Restaurants',
    activities: restaurantRecommendations,
  };

  const touristAttractionsShelf = {
    type: 'tourist-attractions',
    title: 'Popular Tourist Attractions',
    description: `Famous spots in ${trip.city.name} that are loved by visitors`,
    activities: touristAttractionRecommendations,
  };

  const shelves = [mustSeeShelf, restaurantShelf, touristAttractionsShelf];

  return <TripPageClient trip={trip as unknown as ParsedTrip} shelves={shelves} />;
}
