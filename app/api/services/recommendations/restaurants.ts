import { ActivityRecommendation, PriceLevel, ReviewCountTier } from '@prisma/client';

import { prisma } from '@/lib/db';
import { Cuisine, DietaryRestriction } from '@/lib/stores/preferences';
import { OpeningHours, ScoredActivityRecommendation } from '@/lib/types/recommendations';
import { getTimeOfDay, isOperatingNow } from '@/lib/utils/datetime';

export interface RestaurantScoringParams {
  pricePreference: number;
  dietaryRestrictions: DietaryRestriction[];
  cuisinePreferences: {
    preferred: Cuisine[];
    avoided: Cuisine[];
  };
  mealImportance: {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
  };
  transportPreferences: string[];
  crowdPreference: 'popular' | 'hidden' | 'mixed';
  budget: string;
  startTime?: string;
  currentLocation?: { lat: number; lng: number };
}

export const restaurantRecommendationService = {
  async getRecommendations(cityId: string, params: RestaurantScoringParams) {
    const restaurants = (await prisma.activityRecommendation.findMany({
      where: {
        cityId,
        placeTypes: {
          hasSome: ['restaurant', 'cafe', 'food'],
        },
      },
    })) as unknown as ActivityRecommendation[];

    const scoredRestaurants = restaurants
      .map(restaurant => ({
        ...restaurant,
        score: this.scoreRestaurant(restaurant, params),
        matchReasons: this.getMatchReasons(restaurant, params),
      }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score);

    return scoredRestaurants as unknown as ScoredActivityRecommendation[];
  },

  scoreRestaurant(restaurant: ActivityRecommendation, params: RestaurantScoringParams): number {
    if (
      !this.meetsHardRequirements(restaurant, params) ||
      !this.isDietaryCompatible(restaurant, params.dietaryRestrictions)
    ) {
      return 0;
    }

    let score = 0;

    // 1. Core Quality Score (0-40 points)
    score += this.calculateCoreScore(restaurant);

    // 2. Dietary Matching Score (0-20 points)
    score += this.calculateDietaryScore(restaurant, params);

    // 3. Meal Context Score (0-20 points)
    score += this.calculateMealContextScore(restaurant, params);

    // 4. Practical Factors Score (0-20 points)
    score += this.calculatePracticalScore(restaurant, params);

    return Math.min(100, score);
  },

  meetsHardRequirements(
    restaurant: ActivityRecommendation,
    params: RestaurantScoringParams
  ): boolean {
    const priceMatch = Math.abs(restaurant.priceLevel - params.pricePreference) <= 1;
    const isOpen = params.startTime
      ? isOperatingNow(restaurant.openingHours as unknown as OpeningHours, params.startTime)
      : true;

    return priceMatch && isOpen;
  },

  calculateCoreScore(restaurant: ActivityRecommendation): number {
    let score = 0;

    // Rating score (0-25 points)
    score += (restaurant.rating / 5) * 25;

    // Review count tier (0-10 points)
    switch (restaurant.reviewCountTier) {
      case 'VERY_HIGH':
        score += 10;
        break;
      case 'HIGH':
        score += 8;
        break;
      case 'MODERATE':
        score += 5;
        break;
      case 'LOW':
        score += 2;
        break;
    }

    // Must-see status (0-5 points)
    if (restaurant.isMustSee) score += 5;

    return score;
  },

  calculateDietaryScore(
    restaurant: ActivityRecommendation,
    params: RestaurantScoringParams
  ): number {
    let score = 0;

    // Cuisine preference matching (0-15 points)
    if (
      restaurant.cuisineTypes?.some((c: string) =>
        params.cuisinePreferences.preferred.includes(c as Cuisine)
      )
    ) {
      score += 15;
    }

    // Penalize avoided cuisines
    if (
      restaurant.cuisineTypes?.some((c: string) =>
        params.cuisinePreferences.avoided.includes(c as Cuisine)
      )
    ) {
      score -= 10;
    }

    // Special dietary options available (0-5 points)
    if (restaurant.hasDietaryOptions) score += 5;

    return Math.max(0, score);
  },

  calculateMealContextScore(
    restaurant: ActivityRecommendation,
    params: RestaurantScoringParams
  ): number {
    let score = 0;

    // Time of day relevance (0-10 points)
    const timeOfDay = getTimeOfDay(params.startTime);
    if (restaurant.bestTimes?.includes(timeOfDay)) {
      score += 10;
    }

    // Meal importance (0-10 points)
    if (timeOfDay === 'morning' && params.mealImportance.breakfast) score += 10;
    if (timeOfDay === 'afternoon' && params.mealImportance.lunch) score += 10;
    if (timeOfDay === 'evening' && params.mealImportance.dinner) score += 10;

    return score;
  },

  calculatePracticalScore(
    restaurant: ActivityRecommendation,
    params: RestaurantScoringParams
  ): number {
    let score = 0;

    // Transportation accessibility (0-10 points)
    if (
      params.transportPreferences.includes('walking') &&
      restaurant.walkingTime &&
      restaurant.walkingTime <= 20
    ) {
      score += 10;
    }

    // Crowd preference matching (0-10 points)
    const popularity = this.getPopularityTier(restaurant);
    if (
      (params.crowdPreference === 'popular' && popularity === 'high') ||
      (params.crowdPreference === 'hidden' && popularity === 'low') ||
      params.crowdPreference === 'mixed'
    ) {
      score += 10;
    }

    return score;
  },

  getMatchReasons(restaurant: ActivityRecommendation, params: RestaurantScoringParams): string[] {
    const reasons = [];

    if (restaurant.rating >= 4.5) {
      reasons.push('Highly rated');
    }

    if (
      restaurant.cuisineTypes?.some((c: string) =>
        params.cuisinePreferences.preferred.includes(c as Cuisine)
      )
    ) {
      reasons.push('Matches your cuisine preferences');
    }

    if (restaurant.isMustSee) {
      reasons.push('Popular destination');
    }

    return reasons;
  },

  isDietaryCompatible(
    restaurant: ActivityRecommendation,
    restrictions: DietaryRestriction[]
  ): boolean {
    if (restrictions.length === 0) return true;
    return restrictions.every(restriction => restaurant.dietaryOptions?.includes(restriction));
  },

  getPopularityTier(restaurant: ActivityRecommendation): 'high' | 'medium' | 'low' {
    if (restaurant.reviewCount > 1000) return 'high';
    if (restaurant.reviewCount > 100) return 'medium';
    return 'low';
  },
};
