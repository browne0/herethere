import { ActivityRecommendation, BusinessStatus, PriceLevel, Prisma } from '@prisma/client';
import _ from 'lodash';

import { ParsedItineraryActivity, TripBudget } from '@/app/trips/[tripId]/types';
import {
  CategoryMapping,
  CUISINE_PREFERENCES,
  GOOGLE_RESTAURANT_TYPES,
  NON_VEGETARIAN_RESTAURANTS,
  PlaceCategory,
} from '@/constants';
import { prisma } from '@/lib/db';
import {
  CrowdPreference,
  Cuisine,
  DietaryRestriction,
  MealImportance,
} from '@/lib/stores/preferences';
import { DEFAULT_PAGE_SIZE, LocationContext, PaginationParams, ScoringParams } from './types';

interface Location {
  latitude: number;
  longitude: number;
  address: string;
  placeId: string;
  neighborhood: string;
}

interface RestaurantCluster {
  center: {
    latitude: number;
    longitude: number;
  };
  radius: number;
  timeSlot: 'breakfast' | 'lunch' | 'dinner';
}

const VEGETARIAN_RESTAURANT_TYPES = [
  'indian_restaurant',
  'chinese_restaurant',
  'japanese_restaurant',
  'thai_restaurant',
  'vietnamese_restaurant',
  'italian_restaurant',
  'middle_eastern_restaurant',
  'vegetarian_restaurant',
];

export const restaurantRecommendationService = {
  async getRecommendations(params: ScoringParams, pagination: PaginationParams) {
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE } = pagination;
    const { cityId, dietaryRestrictions } = params;

    // Check for null mealImportance
    if (!params.mealImportance) {
      params.mealImportance = {
        breakfast: false,
        lunch: false,
        dinner: false,
      };
    }

    const isVegetarian = (dietaryRestrictions as DietaryRestriction[]).includes('vegetarian');

    let locationContext = params.locationContext;

    // Calculate restaurant clusters if we have selected activities
    if (params.phase === 'planning' && params.selectedActivities?.length > 0) {
      const restaurantClusters = this.calculateRestaurantClusters(params.selectedActivities);
      locationContext = {
        ...locationContext,
        clusters: restaurantClusters as unknown as LocationContext['clusters'],
      };
    }

    const baseQuery = {
      cityId,
      businessStatus: BusinessStatus.OPERATIONAL,
    };

    const queryConditions: Prisma.ActivityRecommendationWhereInput = isVegetarian
      ? {
          ...baseQuery,
          AND: [
            {
              placeTypes: {
                hasSome: VEGETARIAN_RESTAURANT_TYPES,
              },
            },
            {
              NOT: {
                placeTypes: {
                  hasSome: NON_VEGETARIAN_RESTAURANTS,
                },
              },
            },
          ],
        }
      : {
          ...baseQuery,
          primaryType: {
            in: [...CategoryMapping[PlaceCategory.RESTAURANT].includedTypes],
          },
        };

    // 1. Get ALL matching restaurants first
    const restaurants = await prisma.activityRecommendation.findMany({
      where: queryConditions,
    });

    // 2. Score and sort ALL restaurants
    const scoredAndSorted = restaurants
      .map(restaurant => ({
        ...restaurant,
        score: this.calculateScore(restaurant, params),
      }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score);

    // 3. Calculate pagination
    const total = scoredAndSorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePageNumber = Math.min(Math.max(1, page), totalPages);

    // 4. Get the correct slice of data for the requested page
    const startIndex = (safePageNumber - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, total);

    return {
      items: scoredAndSorted.slice(startIndex, endIndex),
      total,
      page: safePageNumber,
      pageSize,
      totalPages,
      hasNextPage: safePageNumber < totalPages,
      hasPreviousPage: safePageNumber > 1,
    };
  },

  calculateRestaurantClusters(activities: ParsedItineraryActivity[]): RestaurantCluster[] {
    if (activities.length < 2) return [];

    // Group activities by day/time slots
    const timeSlots = _.groupBy(activities, activity => {
      const hour = new Date(activity.startTime).getHours();
      if (hour < 11) return 'breakfast' as const;
      if (hour < 16) return 'lunch' as const;
      return 'dinner' as const;
    });

    // Create clusters for each time slot
    return Object.entries(timeSlots).map(([timeSlot, slotActivities]) => {
      const locations = slotActivities.map(a => ({
        latitude: (a.recommendation.location as any).latitude,
        longitude: (a.recommendation.location as any).longitude,
      }));

      // Calculate center
      const center = {
        latitude: _.meanBy(locations, 'latitude'),
        longitude: _.meanBy(locations, 'longitude'),
      };

      // Calculate radius based on standard deviation
      const distances = locations.map(loc =>
        this.calculateDistance(center.latitude, center.longitude, loc.latitude, loc.longitude)
      );

      const mean = _.mean(distances);
      const squareDiffs = distances.map(value => {
        const diff = value - mean;
        return diff * diff;
      });
      const standardDeviation = Math.sqrt(_.mean(squareDiffs));

      // Smaller radius for restaurants compared to attractions
      const radius = Math.max(
        1000, // Minimum 1km radius
        mean + standardDeviation
      );

      return {
        center,
        radius,
        timeSlot: timeSlot as 'breakfast' | 'lunch' | 'dinner',
      };
    });
  },

  calculateScore(restaurant: ActivityRecommendation, params: ScoringParams): number {
    const weights = this.calculateWeights(params);

    const qualityScore = this.calculateQualityScore(restaurant);
    const priceScore = this.calculatePriceScore(restaurant, params);
    const matchScore = this.calculateMatchScore(restaurant, params);
    const locationScore = this.calculateLocationScore(restaurant, params.locationContext, params);
    const mustSeeScore = this.calculateMustSeeScore(restaurant);

    return (
      qualityScore * weights.quality +
      priceScore * weights.price +
      matchScore * weights.match +
      locationScore * weights.location +
      mustSeeScore * weights.mustSee
    );
  },

  calculateWeights(params: ScoringParams) {
    // Base weights with increased emphasis on match (cuisine preferences)
    const weights = {
      quality: 0.25,
      price: 0.2,
      match: 0.35,
      location: 0.15,
      mustSee: 0.05,
    };

    // Get current hour for time-based adjustments
    const currentHour = new Date().getHours();
    const currentMealType = this.getCurrentMealType(currentHour);

    // Check if current meal type is important to user
    const isCurrentMealImportant = params.mealImportance?.[currentMealType] ?? true;

    // Adjust weights based on meal importance
    if (isCurrentMealImportant) {
      // For important meals, increase match weight even further
      weights.match += 0.05;
      weights.location -= 0.05;
    } else {
      // For less important meals, be more lenient with cuisine matching
      weights.match -= 0.05;
      weights.location += 0.05;
    }

    return weights;
  },

  getCurrentMealType(hour: number): keyof MealImportance {
    if (hour < 11) return 'breakfast';
    if (hour < 16) return 'lunch';
    return 'dinner';
  },

  calculateMustSeeScore(restaurant: ActivityRecommendation): number {
    return restaurant.isMustSee ? 1 : 0;
  },

  calculateQualityScore(restaurant: ActivityRecommendation): number {
    let score = 0;

    // Rating Quality (0-0.6)
    switch (restaurant.ratingTier) {
      case 'EXCEPTIONAL':
        score += 0.6;
        break;
      case 'HIGH':
        score += 0.45;
        break;
      case 'AVERAGE':
        score += 0.3;
        break;
      case 'LOW':
        score += 0.15;
        break;
    }

    // Review Volume (0-0.4)
    switch (restaurant.reviewCountTier) {
      case 'VERY_HIGH':
        score += 0.4;
        break;
      case 'HIGH':
        score += 0.3;
        break;
      case 'MODERATE':
        score += 0.2;
        break;
      case 'LOW':
        score += 0.1;
        break;
    }

    return score;
  },

  calculatePriceScore(restaurant: ActivityRecommendation, params: ScoringParams): number {
    // For free attractions, give high score if budget conscious
    if (restaurant.priceLevel === 'PRICE_LEVEL_FREE') {
      return params.budget === 'budget' ? 1 : 0.8;
    }

    const budgetMap: Record<TripBudget, PriceLevel[]> = {
      budget: ['PRICE_LEVEL_FREE', 'PRICE_LEVEL_INEXPENSIVE'],
      moderate: ['PRICE_LEVEL_MODERATE'],
      luxury: ['PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE'],
    };

    // Direct budget match (0-0.6)
    let score = budgetMap[params.budget].includes(restaurant.priceLevel) ? 0.6 : 0;

    // Price level alignment (0-0.4)
    const priceMap: Record<PriceLevel, number> = {
      PRICE_LEVEL_UNSPECIFIED: 3,
      PRICE_LEVEL_FREE: 1,
      PRICE_LEVEL_INEXPENSIVE: 2,
      PRICE_LEVEL_MODERATE: 3,
      PRICE_LEVEL_EXPENSIVE: 4,
      PRICE_LEVEL_VERY_EXPENSIVE: 5,
    };

    const budgetValues = {
      budget: 1.5,
      moderate: 3,
      luxury: 4.5,
    };

    const priceDiff = Math.abs(priceMap[restaurant.priceLevel] - budgetValues[params.budget]);
    score += Math.max(0, 0.4 - priceDiff * 0.1);

    return score;
  },

  calculateMatchScore(restaurant: ActivityRecommendation, params: ScoringParams): number {
    const types = restaurant.placeTypes || [];

    // Calculate cuisine match with enhanced scoring
    const cuisineScore = this.calculateCuisineScore(
      types,
      params.cuisinePreferences,
      params.crowdPreference!
    );

    const currentHour = new Date().getHours();
    const currentMealType = this.getCurrentMealType(currentHour);
    const isMealImportant = params.mealImportance?.[currentMealType] ?? true;

    // Enhanced cuisine score adjustment
    let finalScore = cuisineScore;
    if (isMealImportant) {
      // For important meals, be even stricter with cuisine matching
      finalScore = Math.pow(cuisineScore, 0.8); // Less penalty for slight mismatches
    } else {
      // For less important meals, be more lenient but still maintain preference
      finalScore = cuisineScore * 0.8 + 0.2; // Higher base score but still respects preferences
    }

    return finalScore;
  },

  calculateCuisineScore(
    types: string[],
    preferences: { preferred: Cuisine[]; avoided: Cuisine[] },
    crowdPreference: CrowdPreference
  ): number {
    let score = 0;
    const cuisineValues = new Set(CUISINE_PREFERENCES.map(cuisine => cuisine.value));

    const cuisineTypes = types.filter(item => {
      const normalizedItem = item.replace(/_restaurant$/, '');
      return cuisineValues.has(normalizedItem as Cuisine);
    });

    // No cuisine types identified
    if (cuisineTypes.length === 0) return 0.3; // Reduced from 0.5 to favor known cuisines

    // Strict avoidance of disliked cuisines
    if (preferences.avoided.some(avoided => cuisineTypes.some(t => t.includes(avoided)))) {
      return 0;
    }

    // Enhanced preferred cuisine matching
    const preferredMatches = preferences.preferred.filter(preferred =>
      cuisineTypes.some(t => t.includes(preferred))
    ).length;

    if (preferredMatches > 0) {
      // Enhanced scoring for preferred matches
      score = (preferredMatches / preferences.preferred.length) * 1.2; // 20% bonus for matching preferences
      score = Math.min(1, score); // Cap at 1.0

      if (crowdPreference === 'hidden') {
        score *= 0.9; // Reduced penalty for hidden gems
      }
    }

    return score;
  },

  calculateLocationScore(
    restaurant: ActivityRecommendation,
    context: LocationContext,
    params: ScoringParams
  ): number {
    const location = restaurant.location as unknown as Location;
    let score = 0;

    switch (context.type) {
      case 'city_center': {
        // Restaurants should be closer to center during initial planning
        const distance = this.calculateDistance(
          context.reference.latitude,
          context.reference.longitude,
          location.latitude,
          location.longitude
        );

        // Tighter radius for restaurants
        if (distance <= 1000) score = 1.0;
        else if (distance <= 2500) score = 0.7;
        else score = 0.4;
        break;
      }

      case 'current_location': {
        const distance = this.calculateDistance(
          context.reference.latitude,
          context.reference.longitude,
          location.latitude,
          location.longitude
        );

        // Shorter distance threshold for restaurants
        score = Math.max(0, 1 - distance / 2500);
        break;
      }

      case 'activity_cluster': {
        if (!context.clusters?.length) {
          score = 0.5;
          break;
        }

        // Find relevant clusters based on time slots and meal importance
        const currentHour = new Date().getHours();
        const currentMealType = this.getCurrentMealType(currentHour);
        const isMealImportant = params.mealImportance?.[currentMealType] ?? true;

        const restaurantClusters = context.clusters as unknown as RestaurantCluster[];
        const relevantClusters = restaurantClusters.filter(cluster => {
          // If meal isn't important, consider all clusters
          if (!isMealImportant) return true;

          // Otherwise, only consider clusters for the current meal time
          return cluster.timeSlot === currentMealType;
        });

        if (relevantClusters.length === 0) {
          score = 0.5;
          break;
        }

        // Score based on closest relevant cluster
        const clusterScores = relevantClusters.map(cluster => {
          const distanceToCluster = this.calculateDistance(
            cluster.center.latitude,
            cluster.center.longitude,
            location.latitude,
            location.longitude
          );
          return Math.max(0, 1 - distanceToCluster / cluster.radius);
        });

        score = Math.max(...clusterScores);
        break;
      }
    }

    return score;
  },

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  },
};
