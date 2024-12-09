import { auth } from '@clerk/nextjs/server';
import { City } from '@prisma/client';
import { redirect } from 'next/navigation';

import { isCityCoastal, PARK_TYPES } from '@/constants';
import { prisma } from '@/lib/db';

import { TripPageClient } from './TripPageClient';
import { ParsedItineraryActivity, ParsedTrip } from './types';

function parseItineraryActivity(activity: any): ParsedItineraryActivity {
  return {
    ...activity,
    customizations: activity.customizations ? JSON.parse(activity.customizations) : null,
  };
}

async function fetchMustSeeLocations(cityId: string) {
  return await prisma.activityRecommendation.findMany({
    where: {
      cityId,
      isMustSee: true,
    },
    orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
    // take: limit,
  });
}

async function fetchMuseumsAndGalleries(cityId: string) {
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

async function fetchHistoricalSites(cityId: string) {
  return await prisma.activityRecommendation.findMany({
    where: {
      cityId,
      OR: [
        // Religious sites (churches, temples, etc.)
        {
          placeTypes: {
            hasSome: ['church', 'synagogue', 'mosque', 'hindu_temple'],
          },
        },
        // Other historical sites
        {
          placeTypes: {
            hasSome: [
              'tourist_attraction',
              'point_of_interest',
              'natural_feature',
              'train_station',
              'premise',
            ],
          },
        },
      ],
    },
  });
}

async function fetchShoppingDestinations(cityId: string) {
  return await prisma.activityRecommendation.findMany({
    where: {
      cityId,
      AND: [
        {
          OR: [
            // Shopping malls and department stores
            {
              placeTypes: {
                hasSome: ['shopping_mall', 'department_store'],
              },
            },
            // Markets and shopping districts
            {
              AND: [
                {
                  rating: { gte: 4.0 }, // Using your MARKET threshold
                  reviewCount: { gte: 500 },
                },
              ],
            },
          ],
        },
      ],
    },
    orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
  });
}

async function fetchParksAndGardens(cityId: string) {
  const botanicalTerms = Array.from(PARK_TYPES.BOTANICAL);
  const urbanTerms = Array.from(PARK_TYPES.URBAN);

  return await prisma.activityRecommendation.findMany({
    where: {
      cityId,
      AND: [
        {
          OR: [
            // Botanical Gardens - stricter criteria
            {
              AND: [
                { placeTypes: { hasSome: ['park'] } },
                {
                  OR: botanicalTerms.map(term => ({
                    name: {
                      contains: term,
                      mode: 'insensitive',
                    },
                  })),
                },
              ],
            },
            // Urban Parks - require park type and term match
            {
              AND: [
                { placeTypes: { hasSome: ['park'] } },
                {
                  OR: urbanTerms.map(term => ({
                    name: {
                      contains: term,
                      mode: 'insensitive',
                    },
                  })),
                },
              ],
            },
          ],
        },
        // Thresholds based on type
        {
          rating: { gte: 4.0 },
          reviewCount: { gte: 500 },
        },
      ],
    },
    orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
  });
}

async function fetchBeachesAndWaterfront(city: City) {
  // Only fetch beaches if it's a coastal city
  if (!city || !isCityCoastal(city)) {
    return [];
  }

  return await prisma.activityRecommendation.findMany({
    where: {
      cityId: city.id,
      OR: [
        // Natural beaches
        {
          placeTypes: { hasSome: ['natural_feature'] },
          name: {
            mode: 'insensitive',
            contains: 'beach',
          },
        },
        // Waterfront areas, piers, etc
        {
          name: {
            mode: 'insensitive',
            contains: 'waterfront',
          },
        },
        {
          name: {
            mode: 'insensitive',
            contains: 'pier',
          },
        },
        {
          name: {
            mode: 'insensitive',
            contains: 'harbor',
          },
        },
        {
          name: {
            mode: 'insensitive',
            contains: 'boardwalk',
          },
        },
      ],
      rating: { gte: 4.0 }, // Using your BEACH threshold
      reviewCount: { gte: 500 },
    },
    orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
  });
}

async function fetchNightlifeVenues(cityId: string) {
  return await prisma.activityRecommendation.findMany({
    where: {
      cityId,
      AND: [
        {
          placeTypes: {
            hasSome: ['night_club', 'bar', 'casino'],
          },
        },
        {
          rating: { gte: 4.0 }, // Using your NIGHTLIFE threshold
          reviewCount: { gte: 500 },
        },
      ],
    },
    orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
  });
}

async function fetchRestaurants(cityId: string) {
  return await prisma.activityRecommendation.findMany({
    where: {
      cityId,
      placeTypes: { hasSome: ['restaurant'] },
      OR: [
        // Upscale restaurants
        {
          AND: [
            {
              OR: [{ priceLevel: 'HIGH' }, { priceLevel: 'VERY_HIGH' }],
            },
            {
              rating: { gte: 4.4 }, // Using your UPSCALE threshold
              reviewCount: { gte: 300 },
            },
          ],
        },
        // Standard restaurants
        {
          AND: [
            {
              rating: { gte: 4.2 }, // Using your STANDARD threshold
              reviewCount: { gte: 500 },
            },
          ],
        },
      ],
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

  const [
    iconicLandmarks,
    museumsAndGalleries,
    historicalSites,
    parksAndGardens,
    beachesAndWaterfront,
    nightlifeVenues,
    shoppingDestinations,
    restaurants,
  ] = await Promise.all([
    fetchMustSeeLocations(trip.city.id),
    fetchMuseumsAndGalleries(trip.city.id),
    fetchHistoricalSites(trip.city.id),
    fetchParksAndGardens(trip.city.id),
    fetchBeachesAndWaterfront(trip.city),
    fetchNightlifeVenues(trip.city.id),
    fetchShoppingDestinations(trip.city.id),
    fetchRestaurants(trip.city.id),
  ]);

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
    {
      title: `Historical Sites`,
      type: 'historical-sites',
      activities: historicalSites,
    },
    {
      title: `Parks & Gardens`,
      type: 'parks',
      activities: parksAndGardens,
    },
    {
      title: `Beaches & Waterfronts`,
      type: 'beaches',
      activities: beachesAndWaterfront,
    },
    {
      title: `Nightlife & Entertainment`,
      type: 'nightlife',
      activities: nightlifeVenues,
    },
    {
      title: `Shopping Destinations`,
      type: 'shopping',
      activities: shoppingDestinations,
    },
    {
      title: `Top Restaurants`,
      type: 'restaurants',
      activities: restaurants,
    },
  ];

  return <TripPageClient trip={parsedTrip} shelves={shelves} />;
}
