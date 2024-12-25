// app/trips/[tripId]/page.tsx
import { auth } from '@clerk/nextjs/server';
import { Camera, Flower2, HandPlatter, Landmark, Martini, Palette, Star } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';

import { essentialExperiencesRecommendationService } from '@/app/api/services/recommendations/essentialExperiences';
import { historicSitesRecommendationService } from '@/app/api/services/recommendations/historicSites';
import { museumRecommendationService } from '@/app/api/services/recommendations/museums';
import { nightlifeRecommendationService } from '@/app/api/services/recommendations/nightlife';
import { restaurantRecommendationService } from '@/app/api/services/recommendations/restaurants';
import { spaWellnessRecommendationService } from '@/app/api/services/recommendations/spas';
import { touristAttractionService } from '@/app/api/services/recommendations/touristAttractions';
import {
  DEFAULT_PAGE_SIZE,
  LocationContext,
  ScoringParams,
} from '@/app/api/services/recommendations/types';
import { prisma } from '@/lib/db';

import { TripPageClient } from './TripPageClient';
import { ActivityCategoryType, ParsedItineraryActivity, ParsedTrip } from './types';

export default async function TripPage({
  params,
  searchParams,
}: {
  params: { tripId: string };
  searchParams: { [key: string]: string | undefined };
}) {
  const { userId } = await auth();
  const { tripId } = await params;
  const syncSearchParams = await searchParams;

  // Get current category and page from URL params
  const currentCategory = syncSearchParams['category'] || 'must-see';
  const currentPage = parseInt(syncSearchParams['page'] || '1');
  const paginationParams = { page: currentPage, pageSize: DEFAULT_PAGE_SIZE };

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

  const cityCenter = {
    latitude: trip.city.latitude,
    longitude: trip.city.longitude,
  };

  const locationContext =
    trip.activities.length > 0
      ? {
          type: 'activity_cluster' as LocationContext['type'],
          reference: cityCenter,
          selectedActivities: trip.activities,
        }
      : {
          type: 'city_center' as LocationContext['type'],
          reference: cityCenter,
        };

  const today = new Date();
  const tripStart = new Date(trip.startDate);
  const tripEnd = new Date(trip.endDate);
  const phase: ScoringParams['phase'] =
    today >= tripStart && today <= tripEnd ? 'active' : 'planning';

  const recommendationsData: ScoringParams = {
    cityId: trip.city.id,
    dietaryRestrictions: trip?.preferences?.dietaryRestrictions,
    cuisinePreferences: trip?.preferences?.cuisinePreferences,
    mealImportance: user?.preferences?.mealImportance,
    transportPreferences: user?.preferences?.transportPreferences,
    crowdPreference: user?.preferences?.crowdPreference,
    budget: trip.preferences?.budget,
    interests: user?.preferences?.interests,
    energyLevel: user?.preferences?.energyLevel,
    preferredStartTime: user?.preferences?.preferredStartTime,
    locationContext,
    phase: phase,
    selectedActivities: trip.activities as unknown as ParsedItineraryActivity[],
  };

  // Fetch all recommendations in parallel
  const [
    essentialExperiencesRecommendations,
    restaurantRecommendations,
    touristAttractionRecommendations,
    museumsRecommendations,
    historicSitesRecommendations,
    nightlifeRecommendations,
    spaAndWellnessRecommendations,
  ] = await Promise.all([
    essentialExperiencesRecommendationService.getRecommendations(
      recommendationsData,
      paginationParams
    ),
    restaurantRecommendationService.getRecommendations(recommendationsData, paginationParams),
    touristAttractionService.getRecommendations(recommendationsData, paginationParams),
    museumRecommendationService.getRecommendations(recommendationsData, paginationParams),
    historicSitesRecommendationService.getRecommendations(recommendationsData, paginationParams),
    nightlifeRecommendationService.getRecommendations(recommendationsData, paginationParams),
    spaWellnessRecommendationService.getRecommendations(recommendationsData, paginationParams),
  ]);

  const categories = [
    {
      type: 'must-see',
      icon: <Star className="w-5 h-5 mb-2" />,
      title: `Must See in ${trip.city.name}`,
      description: 'Essential experiences and notable attractions',
      activities: essentialExperiencesRecommendations.items,
      pagination: {
        currentPage: essentialExperiencesRecommendations.page,
        totalPages: essentialExperiencesRecommendations.totalPages,
        hasNextPage: essentialExperiencesRecommendations.hasNextPage,
        hasPreviousPage: essentialExperiencesRecommendations.hasPreviousPage,
      },
    },
    {
      type: 'tourist-attractions',
      icon: <Camera className="w-5 h-5 mb-2" />,
      title: 'Popular Tourist Attractions',
      description: `Famous spots in ${trip.city.name} that are loved by visitors`,
      activities: touristAttractionRecommendations.items,
      pagination: {
        currentPage: touristAttractionRecommendations.page,
        totalPages: touristAttractionRecommendations.totalPages,
        hasNextPage: touristAttractionRecommendations.hasNextPage,
        hasPreviousPage: touristAttractionRecommendations.hasPreviousPage,
      },
    },
    {
      type: 'culture',
      title: 'Museums & Cultural Spaces',
      icon: <Palette className="w-5 h-5 mb-2" />,
      description: `Art, history, and cultural treasures in ${trip.city.name} to explore`,
      activities: museumsRecommendations.items,
      pagination: {
        currentPage: museumsRecommendations.page,
        totalPages: museumsRecommendations.totalPages,
        hasNextPage: museumsRecommendations.hasNextPage,
        hasPreviousPage: museumsRecommendations.hasPreviousPage,
      },
    },
    {
      type: 'historic-sites',
      icon: <Landmark className="w-5 h-5 mb-2" />,
      title: 'Historic & Cultural Landmarks',
      description: `Iconic institutions and landmarks that define ${trip.city.name}'s character`,
      activities: historicSitesRecommendations.items,
      pagination: {
        currentPage: historicSitesRecommendations.page,
        totalPages: historicSitesRecommendations.totalPages,
        hasNextPage: historicSitesRecommendations.hasNextPage,
        hasPreviousPage: historicSitesRecommendations.hasPreviousPage,
      },
    },
    {
      type: 'restaurants',
      icon: <HandPlatter className="w-5 h-5 mb-2" />,
      description: 'Curated dining picks just for you',
      title: 'Popular Restaurants & Foodie Spots',
      activities: restaurantRecommendations.items,
      pagination: {
        currentPage: restaurantRecommendations.page,
        totalPages: restaurantRecommendations.totalPages,
        hasNextPage: restaurantRecommendations.hasNextPage,
        hasPreviousPage: restaurantRecommendations.hasPreviousPage,
      },
    },
    {
      type: 'nightlife',
      title: 'Nightlife & Entertainment',
      icon: <Martini className="w-5 h-5 mb-2" />,
      description: `From stylish rooftop bars to legendary music venues`,
      activities: nightlifeRecommendations.items,
      pagination: {
        currentPage: nightlifeRecommendations.page,
        totalPages: nightlifeRecommendations.totalPages,
        hasNextPage: nightlifeRecommendations.hasNextPage,
        hasPreviousPage: nightlifeRecommendations.hasPreviousPage,
      },
    },
    {
      type: 'spas-&-wellness',
      title: 'Spas & Wellness',
      icon: <Flower2 className="w-5 h-5 mb-2" />,
      description: `From luxury day spas to premium wellness experiences`,
      activities: spaAndWellnessRecommendations.items,
      pagination: {
        currentPage: spaAndWellnessRecommendations.page,
        totalPages: spaAndWellnessRecommendations.totalPages,
        hasNextPage: spaAndWellnessRecommendations.hasNextPage,
        hasPreviousPage: spaAndWellnessRecommendations.hasPreviousPage,
      },
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
