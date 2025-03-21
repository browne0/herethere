import { auth } from '@clerk/nextjs/server';
import {
  Camera,
  Flower2,
  HandPlatter,
  Landmark,
  Martini,
  Palette,
  Sparkles,
  Star,
} from 'lucide-react';
import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { forYouRecommendationsService } from '@/app/api/services/recommendations/forYouRecommendations';
import { historicSitesRecommendationService } from '@/app/api/services/recommendations/historicSites';
import { museumRecommendationService } from '@/app/api/services/recommendations/museums';
import { nightlifeRecommendationService } from '@/app/api/services/recommendations/nightlife';
import { popularRecommendationsService } from '@/app/api/services/recommendations/popularRecommendations';
import { restaurantRecommendationService } from '@/app/api/services/recommendations/restaurants';
import { spaWellnessRecommendationService } from '@/app/api/services/recommendations/spas';
import { touristAttractionService } from '@/app/api/services/recommendations/touristAttractions';
import {
  DEFAULT_PAGE_SIZE,
  LocationContext,
  ScoringParams,
} from '@/app/api/services/recommendations/types';
import { prisma } from '@/lib/db';
import { UserPreferences } from '@/lib/stores/preferences';
import { ActivityRecommendation } from '@/lib/types/recommendations';

import { tripService } from '@/app/api/services/trips';
import { TripPageClient } from './TripPageClient';
import {
  ActivityCategoryType,
  ParsedItineraryActivity,
  ParsedTrip,
  TripPreferences,
} from './types';

export function isUserPreferences(obj: unknown): obj is UserPreferences {
  return obj !== null && typeof obj === 'object';
}

export function isTripPreferences(obj: unknown): obj is TripPreferences {
  return obj !== null && typeof obj === 'object';
}

// Update your database calls
const getUserPreferences = (preferences: unknown): UserPreferences => {
  if (!isUserPreferences(preferences)) {
    return {
      interests: [],
      energyLevel: null,
      preferredStartTime: null,
      dietaryRestrictions: [],
      cuisinePreferences: { preferred: [], avoided: [] },
      mealImportance: { breakfast: false, lunch: false, dinner: false },
      transportPreferences: [],
      crowdPreference: null,
    };
  }
  return preferences;
};

const getTripPreferences = (preferences: unknown): TripPreferences => {
  if (!isTripPreferences(preferences)) {
    return {
      budget: 'moderate',
      activities: [],
      dietaryRestrictions: [],
      cuisinePreferences: { preferred: [], avoided: [] },
    };
  }
  return preferences;
};

export default async function TripPage({
  params,
  searchParams,
}: {
  params: { tripId: string };
  searchParams: { [key: string]: string | undefined };
}) {
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
    notFound();
  }

  const syncSearchParams = await searchParams;

  const currentCategory = syncSearchParams['category'] || 'for-you';
  const currentPage = parseInt(syncSearchParams['page'] || '1');

  const cityCenter = {
    latitude: trip.city.latitude,
    longitude: trip.city.longitude,
  };

  const locationContext: LocationContext =
    trip.activities.length > 0
      ? {
          type: 'activity_cluster',
          reference: cityCenter,
        }
      : {
          type: 'city_center',
          reference: cityCenter,
        };

  const today = new Date();
  const tripStart = new Date(trip.startDate);
  const tripEnd = new Date(trip.endDate);
  const phase: ScoringParams['phase'] =
    today >= tripStart && today <= tripEnd ? 'active' : 'planning';

  const recommendationsData = {
    cityId: trip.city.id,
    ...getUserPreferences(user?.preferences),
    ...getTripPreferences(trip?.preferences),
    locationContext,
    phase,
    selectedActivities: trip.activities as unknown as ParsedItineraryActivity[],
  };

  // Get the appropriate service based on category
  const getServiceForCategory = (category: string) => {
    switch (category) {
      case 'for-you':
        return forYouRecommendationsService;
      case 'popular':
        return popularRecommendationsService;
      case 'tourist-attractions':
        return touristAttractionService;
      case 'culture':
        return museumRecommendationService;
      case 'historic-sites':
        return historicSitesRecommendationService;
      case 'restaurants':
        return restaurantRecommendationService;
      case 'nightlife':
        return nightlifeRecommendationService;
      case 'spas-&-wellness':
        return spaWellnessRecommendationService;
      default:
        return forYouRecommendationsService;
    }
  };

  const service = getServiceForCategory(currentCategory);
  const recommendations = await service.getRecommendations(recommendationsData, {
    page: currentPage,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  // Define all categories but only populate data for the current one
  const categories: ActivityCategoryType[] = [
    {
      type: 'for-you',
      icon: <Sparkles className="w-5 h-5" />,
      title: `Recommended For You`,
      description: 'Curated selections based on your preferences',
      activities: (currentCategory === 'for-you'
        ? recommendations.items
        : []) as unknown as ActivityRecommendation[],
      pagination:
        currentCategory === 'for-you'
          ? {
              currentPage: recommendations.page,
              totalPages: recommendations.totalPages,
              hasNextPage: recommendations.hasNextPage,
              hasPreviousPage: recommendations.hasPreviousPage,
            }
          : { currentPage: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    },
    {
      type: 'popular',
      icon: <Star className="w-5 h-5" />,
      title: `Most Popular in ${trip.city.name}`,
      description: 'Essential experiences and notable attractions',
      activities: (currentCategory === 'popular'
        ? recommendations.items
        : []) as unknown as ActivityRecommendation[],
      pagination:
        currentCategory === 'popular'
          ? {
              currentPage: recommendations.page,
              totalPages: recommendations.totalPages,
              hasNextPage: recommendations.hasNextPage,
              hasPreviousPage: recommendations.hasPreviousPage,
            }
          : { currentPage: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    },
    {
      type: 'tourist-attractions',
      icon: <Camera className="w-5 h-5" />,
      title: 'Popular Tourist Attractions',
      description: `Famous spots in ${trip.city.name} that are loved by visitors`,
      activities: (currentCategory === 'tourist-attractions'
        ? recommendations.items
        : []) as unknown as ActivityRecommendation[],
      pagination:
        currentCategory === 'tourist-attractions'
          ? {
              currentPage: recommendations.page,
              totalPages: recommendations.totalPages,
              hasNextPage: recommendations.hasNextPage,
              hasPreviousPage: recommendations.hasPreviousPage,
            }
          : { currentPage: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    },
    {
      type: 'culture',
      title: 'Museums & Cultural Spaces',
      icon: <Palette className="w-5 h-5" />,
      description: `Art, history, and cultural treasures in ${trip.city.name} to explore`,
      activities: (currentCategory === 'culture'
        ? recommendations.items
        : []) as unknown as ActivityRecommendation[],
      pagination:
        currentCategory === 'culture'
          ? {
              currentPage: recommendations.page,
              totalPages: recommendations.totalPages,
              hasNextPage: recommendations.hasNextPage,
              hasPreviousPage: recommendations.hasPreviousPage,
            }
          : { currentPage: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    },
    {
      type: 'historic-sites',
      icon: <Landmark className="w-5 h-5" />,
      title: 'Historic & Cultural Landmarks',
      description: `Iconic institutions and landmarks that define ${trip.city.name}'s character`,
      activities: (currentCategory === 'historic-sites'
        ? recommendations.items
        : []) as unknown as ActivityRecommendation[],
      pagination:
        currentCategory === 'historic-sites'
          ? {
              currentPage: recommendations.page,
              totalPages: recommendations.totalPages,
              hasNextPage: recommendations.hasNextPage,
              hasPreviousPage: recommendations.hasPreviousPage,
            }
          : { currentPage: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    },
    {
      type: 'restaurants',
      icon: <HandPlatter className="w-5 h-5" />,
      description: 'Curated dining picks just for you',
      title: 'Popular Restaurants & Foodie Spots',
      activities: (currentCategory === 'restaurants'
        ? recommendations.items
        : []) as unknown as ActivityRecommendation[],
      pagination:
        currentCategory === 'restaurants'
          ? {
              currentPage: recommendations.page,
              totalPages: recommendations.totalPages,
              hasNextPage: recommendations.hasNextPage,
              hasPreviousPage: recommendations.hasPreviousPage,
            }
          : { currentPage: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    },
    {
      type: 'nightlife',
      title: 'Nightlife & Entertainment',
      icon: <Martini className="w-5 h-5" />,
      description: `From stylish rooftop bars to legendary music venues`,
      activities: (currentCategory === 'nightlife'
        ? recommendations.items
        : []) as unknown as ActivityRecommendation[],
      pagination:
        currentCategory === 'nightlife'
          ? {
              currentPage: recommendations.page,
              totalPages: recommendations.totalPages,
              hasNextPage: recommendations.hasNextPage,
              hasPreviousPage: recommendations.hasPreviousPage,
            }
          : { currentPage: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    },
    {
      type: 'spas-&-wellness',
      title: 'Spas & Wellness',
      icon: <Flower2 className="w-5 h-5" />,
      description: `From luxury day spas to premium wellness experiences`,
      activities: (currentCategory === 'spas-&-wellness'
        ? recommendations.items
        : []) as unknown as ActivityRecommendation[],
      pagination:
        currentCategory === 'spas-&-wellness'
          ? {
              currentPage: recommendations.page,
              totalPages: recommendations.totalPages,
              hasNextPage: recommendations.hasNextPage,
              hasPreviousPage: recommendations.hasPreviousPage,
            }
          : { currentPage: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    },
  ];

  return (
    <TripPageClient
      key={`${currentCategory}-${currentPage}`}
      trip={trip as unknown as ParsedTrip}
      categories={categories as unknown as ActivityCategoryType[]}
    />
  );
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
      title: `${trip.title} - ${trip.city.name}`,
      description: `Your trip to ${trip.city.name} from ${new Date(
        trip.startDate
      ).toLocaleDateString()} to ${new Date(trip.endDate).toLocaleDateString()}`,
    };
  } catch (_error) {
    return {
      title: 'Trip',
    };
  }
}
