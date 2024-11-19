// app/trips/[tripId]/page.tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/db';

import { RecommendationsView } from './components/RecommendationsView';
import { SelectedActivitiesBanner } from './components/SelectedActivitiesBanner';
import { TripHeader } from './components/TripHeader';
import type { ParsedActivityRecommendation } from './types';

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

async function getRecommendations(tripId: string) {
  // Fetch recommendations based on trip details
  const recommendations = await prisma.activityRecommendation.findMany({
    orderBy: {
      rating: 'desc',
    },
  });

  return recommendations.map(parseActivityRecommendation);
}

async function getTripDetails(tripId: string, userId: string) {
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
    },
  });

  if (!trip) {
    redirect('/trips');
  }

  return {
    ...trip,
    activities: trip.activities.map(activity => ({
      ...activity,
      recommendation: parseActivityRecommendation(activity.recommendation),
    })),
  };
}

export default async function TripPage({ params }: { params: { tripId: string } }) {
  const { userId } = await auth();
  const { tripId } = await params;
  if (!userId) {
    redirect('/sign-in');
  }

  const trip = await getTripDetails(tripId, userId);
  const recommendations = await getRecommendations(tripId);

  // Organize recommendations into shelves
  const shelves = [
    {
      title: `Popular in ${trip.destination}`,
      type: 'popular',
      activities: recommendations.slice(0, 5),
    },
    {
      title: 'Based on your interests',
      type: 'personalized',
      activities: recommendations.slice(5, 10),
    },
    {
      title: 'Happening tomorrow',
      type: 'happening-tomorrow',
      activities: recommendations.slice(10),
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      <TripHeader trip={trip} />
      <RecommendationsView
        shelves={shelves}
        tripId={trip.id}
        existingActivityIds={trip.activities.map(a => a.recommendationId)}
      />
      <SelectedActivitiesBanner tripId={trip.id} activities={trip.activities} />
    </main>
  );
}
