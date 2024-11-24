import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/db';

import { TripPageClient } from './TripPageClient';
import { ParsedActivityRecommendation, ParsedItineraryActivity, ParsedTrip } from './types';

// Helper to parse JSON fields from ActivityRecommendation
function parseActivityRecommendation(activity: any): ParsedActivityRecommendation {
  return {
    ...activity,
    location: JSON.parse(activity.location),
    images: JSON.parse(activity.images),
    availableDays: JSON.parse(activity.availableDays),
    openingHours: activity.openingHours ? JSON.parse(activity.openingHours) : null,
    seasonality: JSON.parse(activity.seasonality),
    tags: JSON.parse(activity.tags),
  };
}

function parseItineraryActivity(activity: any): ParsedItineraryActivity {
  return {
    ...activity,
    recommendation: parseActivityRecommendation(activity.recommendation),
    customizations: activity.customizations ? JSON.parse(activity.customizations) : null,
  };
}

// Server component
export default async function TripPage({ params }: { params: { tripId: string } }) {
  const { userId } = await auth();
  const { tripId } = await params;
  if (!userId) {
    redirect('/sign-in');
  }

  const trip = await prisma.trip.findUnique({
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
  });

  if (!trip) {
    redirect('/trips');
  }

  console.log(trip.preferences as string);

  const parsedTrip = {
    ...trip,
    activities: trip.activities.map(parseItineraryActivity),
  } as ParsedTrip;

  const recommendations = await prisma.activityRecommendation.findMany({
    where: {
      // Add filters based on trip preferences
    },
    orderBy: {
      rating: 'desc',
    },
  });

  const parsedRecommendations = recommendations.map(parseActivityRecommendation);

  // Organize recommendations into shelves
  const shelves = [
    {
      title: 'Based on your interests',
      type: 'personalized',
      activities: parsedRecommendations.slice(10, 15),
    },
    {
      title: 'Trending on Social Media',
      type: 'trending-social-media',
      activities: parsedRecommendations.slice(0, 5),
    },
    {
      title: `Popular in ${trip.city.name}`,
      type: 'popular',
      activities: parsedRecommendations.slice(5, 10),
    },
  ];

  return <TripPageClient trip={parsedTrip} shelves={shelves} />;
}
