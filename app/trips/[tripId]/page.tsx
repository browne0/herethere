import { auth } from '@clerk/nextjs/server';
import { ActivityRecommendation } from '@prisma/client';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/db';

import { TripPageClient } from './TripPageClient';
import { ParsedItineraryActivity, ParsedTrip } from './types';

// Helper to parse JSON fields from ActivityRecommendation
function parseActivityRecommendation(activity: any): ActivityRecommendation {
  return {
    ...activity,
    location: JSON.parse(activity.location),
    images: JSON.parse(activity.images),
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

async function fetchMustSeeLocations(cityId: string, limit: number = 10) {
  return await prisma.activityRecommendation.findMany({
    where: {
      cityId,
      isMustSee: true,
    },
    orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
    // take: limit,
  });
}

async function fetchMuseumsAndGalleries(cityId: string, limit: number = 10) {
  return await prisma.activityRecommendation.findMany({
    where: {
      cityId,
      placeTypes: {
        hasSome: ['museum', 'art_gallery'],
      },
    },
    orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
  });
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

  const parsedTrip = {
    ...trip,
    activities: trip.activities.map(parseItineraryActivity),
  } as ParsedTrip;

  const [iconicLandmarks, museumsAndGalleries] = await Promise.all([
    fetchMustSeeLocations(trip.city.id),
    fetchMuseumsAndGalleries(trip.city.id),
  ]);

  console.log(iconicLandmarks);

  // Organize recommendations into shelves
  const shelves = [
    {
      title: `Must-see in ${trip.city.name}`,
      type: 'popular',
      activities: iconicLandmarks,
    },
    {
      title: `Museums & Galleries`,
      type: 'museums',
      activities: museumsAndGalleries,
    },
  ];

  return <TripPageClient trip={parsedTrip} shelves={shelves} />;
}
