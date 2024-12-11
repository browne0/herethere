// app/api/services/recommendations/restaurants.ts
import { ActivityRecommendation, PriceLevel } from '@prisma/client';
import _ from 'lodash';

import { prisma } from '@/lib/db';
import { PricePreference } from '@/lib/stores/preferences';

export type TripBudget = 'budget' | 'moderate' | 'luxury';

export interface RestaurantScoringParams {
  pricePreference: PricePreference;
  dietaryRestrictions: string[];
  cuisinePreferences: {
    preferred: string[];
    avoided: string[];
  };
  mealImportance: Record<string, number>;
  transportPreferences: string[];
  crowdPreference: 'popular' | 'hidden' | 'mixed';
  budget: TripBudget; // Add specific type
  startTime?: string;
  currentLocation?: {
    lat: number;
    lng: number;
  };
}

interface PriceTiers {
  budget: PriceLevel[];
  moderate: PriceLevel[];
  luxury: PriceLevel[];
}

interface Location {
  latitude: number;
  longitude: number;
  address: string;
  placeId: string;
  neighborhood: string;
}

export const restaurantRecommendationService = {
  async getRecommendations(cityId: string, params: RestaurantScoringParams) {
    // 1. Base Query - Get all operational restaurants
    const restaurants = await prisma.activityRecommendation.findMany({
      where: {
        cityId,
        businessStatus: 'OPERATIONAL',
        placeTypes: {
          hasSome: ['restaurant', 'cafe', 'meal_takeaway'],
        },
      },
      orderBy: [{ ratingTier: 'desc' }, { reviewCountTier: 'desc' }],
      take: 50, // Get a larger initial set for scoring
    });

    // 2. Score and filter restaurants
    const scored = restaurants.map(restaurant => {
      let score = 0;

      // Quality Score (0-40 points)
      score += this.calculateQualityScore(restaurant);

      // Price Match Score (0-30 points)
      score += this.calculatePriceScore(restaurant, params);

      // Relevance Score (0-30 points)
      score += this.calculateRelevanceScore(restaurant, params);

      return {
        ...restaurant,
        score,
      };
    });

    // 3. Sort by score and take top 20
    return _.orderBy(scored, ['score'], ['desc'])
      .slice(0, 20)
      .map(({ score, ...restaurant }) => restaurant);
  },

  calculateQualityScore(restaurant: ActivityRecommendation): number {
    let score = 0;

    // Rating Quality (0-25)
    switch (restaurant.ratingTier) {
      case 'EXCEPTIONAL':
        score += 25;
        break;
      case 'HIGH':
        score += 20;
        break;
      case 'AVERAGE':
        score += 15;
        break;
      case 'LOW':
        score += 5;
        break;
    }

    // Review Volume (0-15)
    switch (restaurant.reviewCountTier) {
      case 'VERY_HIGH':
        score += 15;
        break;
      case 'HIGH':
        score += 12;
        break;
      case 'MODERATE':
        score += 8;
        break;
      case 'LOW':
        score += 4;
        break;
    }

    return score;
  },

  calculatePriceScore(restaurant: ActivityRecommendation, params: RestaurantScoringParams): number {
    const budgetMap: PriceTiers = {
      budget: ['PRICE_LEVEL_FREE', 'PRICE_LEVEL_INEXPENSIVE'] as PriceLevel[],
      moderate: ['PRICE_LEVEL_MODERATE'] as PriceLevel[],
      luxury: ['PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE'] as PriceLevel[],
    };

    // Direct budget match (0-20)
    let score = budgetMap[params.budget].includes(restaurant.priceLevel) ? 20 : 0;

    // Price preference alignment (0-10)
    const priceMap: Record<PriceLevel, number> = {
      PRICE_LEVEL_UNSPECIFIED: 3, // Default to moderate
      PRICE_LEVEL_FREE: 1,
      PRICE_LEVEL_INEXPENSIVE: 2,
      PRICE_LEVEL_MODERATE: 3,
      PRICE_LEVEL_EXPENSIVE: 4,
      PRICE_LEVEL_VERY_EXPENSIVE: 5,
    };

    const priceDiff = Math.abs(priceMap[restaurant.priceLevel] - params.pricePreference);
    score += Math.max(0, 10 - priceDiff * 3);

    return score;
  },

  calculateRelevanceScore(
    restaurant: ActivityRecommendation,
    params: RestaurantScoringParams
  ): number {
    let score = 0;

    // Cuisine preference matching (0-15)
    const types = restaurant.googleTypes || [];
    const cuisineTypes = types.filter(type => type.includes('cuisine'));

    if (cuisineTypes.length > 0) {
      const matchesPreferred = params.cuisinePreferences.preferred.some(cuisine =>
        cuisineTypes.some(type => type.includes(cuisine))
      );
      const matchesAvoided = params.cuisinePreferences.avoided.some(cuisine =>
        cuisineTypes.some(type => type.includes(cuisine))
      );

      if (matchesPreferred) score += 15;
      if (matchesAvoided) score -= 30; // Strong negative signal
    }

    // Dietary restrictions (0-15)
    if (params.dietaryRestrictions.includes('vegetarian')) {
      if (types.includes('vegetarian_restaurant')) score += 15;
    }
    if (params.dietaryRestrictions.includes('vegan')) {
      if (types.includes('vegan_restaurant')) score += 15;
    }

    // Location score if provided
    if (params.currentLocation && restaurant.location) {
      const location = restaurant.location as unknown as Location;
      const distance = this.calculateDistance(
        params.currentLocation.lat,
        params.currentLocation.lng,
        location.latitude,
        location.longitude
      );
      score += Math.min(15, Math.max(0, 15 - (distance / 500) * 15));
    }

    return Math.max(0, score); // Ensure non-negative
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
