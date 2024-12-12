import { ActivityRecommendation, PriceLevel } from '@prisma/client';
import _ from 'lodash';

import {
  CUISINE_PREFERENCES,
  GOOGLE_RESTAURANT_TYPES,
  NON_VEGETARIAN_RESTAURANTS,
} from '@/constants';
import { prisma } from '@/lib/db';
import { Cuisine } from '@/lib/stores/preferences';
import { ScoringParams } from './types';
import { TripBudget } from '@/app/trips/[tripId]/types';
interface Location {
  latitude: number;
  longitude: number;
  address: string;
  placeId: string;
  neighborhood: string;
}

export const restaurantRecommendationService = {
  async getRecommendations(cityId: string, params: ScoringParams) {
    // Get excluded types based on dietary restrictions
    const excludedTypes = this.getExcludedTypes(params.dietaryRestrictions);

    // 1. Get initial set of restaurants with dietary and type filtering
    const restaurants = await prisma.activityRecommendation.findMany({
      where: {
        cityId,
        businessStatus: 'OPERATIONAL',
        primaryType: {
          in: GOOGLE_RESTAURANT_TYPES,
          notIn: excludedTypes,
        },
        // Ensure no excluded types in the placeTypes array
        ...(params.dietaryRestrictions.length > 0 && {
          NOT: {
            placeTypes: {
              hasSome: excludedTypes,
            },
          },
        }),
      },
      take: 50,
    });

    // 2. Score restaurants (filtering already done by Prisma query)
    const scored = restaurants.map(restaurant => ({
      ...restaurant,
      score: this.calculateScore(restaurant, params),
    }));

    // 3. Sort by score and filter out low scores
    const recommendations = scored
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    return recommendations;
  },

  getExcludedTypes(restrictions: string[]): string[] {
    if (restrictions.length === 0) return [];

    let excludedTypes = new Set<string>();

    if (restrictions.includes('vegetarian') || restrictions.includes('vegan')) {
      excludedTypes = new Set([...NON_VEGETARIAN_RESTAURANTS]);
    }

    return Array.from(excludedTypes);
  },

  calculateScore(restaurant: ActivityRecommendation, params: ScoringParams): number {
    // Calculate weights based on user preferences
    const weights = this.calculateWeights(params);

    // Calculate individual scores
    const qualityScore = this.calculateQualityScore(restaurant);
    const priceScore = this.calculatePriceScore(restaurant, params);
    const matchScore = this.calculateMatchScore(restaurant, params);
    const mustSeeScore = this.calculateMustSeeScore(restaurant);

    // Combine scores using weights
    return (
      qualityScore * weights.quality +
      priceScore * weights.price +
      matchScore * weights.match +
      mustSeeScore * weights.mustSee
    );
  },

  calculateWeights(params: ScoringParams) {
    const weights = {
      quality: 0.4,
      price: 0.3,
      match: 0.25,
      mustSee: 0.05, // Reduced weight for must-see locations to act more as a tie-breaker
    };

    // Adjust weights based on crowd preference
    if (params.crowdPreference === 'popular') {
      weights.quality += 0.05;
      weights.match -= 0.05;
    } else if (params.crowdPreference === 'hidden') {
      weights.quality -= 0.05;
      weights.match += 0.05;
    }

    // Adjust for dietary restrictions
    if (params.dietaryRestrictions.length > 0) {
      weights.match += 0.05;
      weights.quality -= 0.05;
    }

    // Adjust for budget sensitivity
    if (params.budget === 'budget') {
      weights.price += 0.05;
      weights.quality -= 0.05;
    }

    return weights;
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
    const budgetMap: Record<TripBudget, PriceLevel[]> = {
      budget: ['PRICE_LEVEL_FREE', 'PRICE_LEVEL_INEXPENSIVE'],
      moderate: ['PRICE_LEVEL_MODERATE'],
      luxury: ['PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE'],
    };

    // Perfect budget match
    if (budgetMap[params.budget].includes(restaurant.priceLevel)) {
      return 1.0;
    }

    // Score based on how far from target budget level
    const priceMap: Record<PriceLevel, number> = {
      PRICE_LEVEL_UNSPECIFIED: 3,
      PRICE_LEVEL_FREE: 1,
      PRICE_LEVEL_INEXPENSIVE: 2,
      PRICE_LEVEL_MODERATE: 3,
      PRICE_LEVEL_EXPENSIVE: 4,
      PRICE_LEVEL_VERY_EXPENSIVE: 5,
    };

    const budgetValues = {
      budget: 1.5, // average of free and inexpensive
      moderate: 3,
      luxury: 4.5, // average of expensive and very expensive
    };

    const priceDiff = Math.abs(priceMap[restaurant.priceLevel] - budgetValues[params.budget]);
    return Math.max(0, 1 - priceDiff * 0.25); // Decrease score by 0.25 for each level difference
  },

  calculateMatchScore(restaurant: ActivityRecommendation, params: ScoringParams): number {
    let score = 0;
    const types = restaurant.placeTypes || [];

    // Cuisine preferences (50% if no location, 30% if location provided)
    const cuisineScore = this.calculateCuisineScore(
      types,
      params.cuisinePreferences,
      params.crowdPreference!
    );
    const cuisineWeight = params.currentLocation ? 0.3 : 0.5;
    score += cuisineScore * cuisineWeight;

    // Location score only if both location and restaurant.location are provided
    if (params.currentLocation && restaurant.location) {
      const locationScore = this.calculateLocationScore(
        restaurant.location as unknown as Location,
        params.currentLocation,
        params.transportPreferences
      );
      score += locationScore * 0.3; // 30% of match score
    }

    return score;
  },

  calculateCuisineScore(
    types: string[],
    preferences: { preferred: Cuisine[]; avoided: Cuisine[] },
    crowdPreference: 'popular' | 'hidden' | 'mixed'
  ): number {
    let score = 0;

    // Create a set of cuisine preference values for quick lookup
    const cuisineValues = new Set(CUISINE_PREFERENCES.map(cuisine => cuisine.value));

    const cuisineTypes = types.filter(item => {
      // Extract the possible cuisine value from the item
      const normalizedItem = item.replace(/_restaurant$/, '');
      return cuisineValues.has(normalizedItem as Cuisine);
    });

    // Handle no cuisine types
    if (cuisineTypes.length === 0) return 0.5; // Neutral score

    // Check for avoided cuisines first
    if (preferences.avoided.some(avoided => cuisineTypes.some(t => t.includes(avoided)))) {
      return 0;
    }

    // Calculate preferred cuisine matches
    const preferredMatches = preferences.preferred.filter(preferred =>
      cuisineTypes.some(t => t.includes(preferred))
    ).length;

    if (preferredMatches > 0) {
      score = preferredMatches / preferences.preferred.length;

      // Adjust based on crowd preference
      if (crowdPreference === 'hidden') {
        score *= 0.8; // Slightly lower score for popular choices
      }
    }

    return score;
  },

  calculateLocationScore(
    restaurantLocation: Location,
    currentLocation: { lat: number; lng: number },
    transportPreferences: string[]
  ): number {
    const distance = this.calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      restaurantLocation.latitude,
      restaurantLocation.longitude
    );

    // Adjust acceptable distance based on transport preferences
    let maxDistance = 500; // Default 500m for walking
    if (transportPreferences.includes('public_transit')) {
      maxDistance = 2000; // 2km for public transit
    } else if (transportPreferences.includes('driving')) {
      maxDistance = 5000; // 5km for driving
    }

    return Math.max(0, 1 - distance / maxDistance);
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
