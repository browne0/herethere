import { ActivityRecommendation, PriceLevel } from '@prisma/client';
import _ from 'lodash';

import { CategoryMapping, CUISINE_PREFERENCES } from '@/constants';
import { prisma } from '@/lib/db';
import { Cuisine, PricePreference } from '@/lib/stores/preferences';

export type TripBudget = 'budget' | 'moderate' | 'luxury';

export interface RestaurantScoringParams {
  pricePreference: PricePreference;
  dietaryRestrictions: string[];
  cuisinePreferences: {
    preferred: Cuisine[];
    avoided: Cuisine[];
  };
  mealImportance: Record<string, number>;
  transportPreferences: string[];
  crowdPreference: 'popular' | 'hidden' | 'mixed';
  budget: TripBudget;
  startTime?: string;
  currentLocation?: {
    lat: number;
    lng: number;
  };
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
    // 1. Get initial set of restaurants
    const restaurants = await prisma.activityRecommendation.findMany({
      where: {
        cityId,
        businessStatus: 'OPERATIONAL',
        primaryType: {
          in: CategoryMapping.RESTAURANT.includedTypes,
        },
      },
      take: 50, // Get larger initial set for scoring
    });

    // 2. Score restaurants
    const scored = restaurants.map(restaurant => ({
      ...restaurant,
      score: this.calculateScore(restaurant, params),
    }));

    // 3. Sort by score and filter out low scores
    const recommendations = scored
      .filter(r => r.score > 0) // Remove any that failed hard requirements
      .sort((a, b) => b.score - a.score)
      .slice(0, 20); // Take top 20
    // .map(({ score, ...restaurant }) => restaurant);

    console.log(recommendations);

    return recommendations;
  },

  calculateScore(restaurant: ActivityRecommendation, params: RestaurantScoringParams): number {
    // Calculate weights based on user preferences
    const weights = this.calculateWeights(params);

    // Calculate individual scores
    const qualityScore = this.calculateQualityScore(restaurant);
    const priceScore = this.calculatePriceScore(restaurant, params);
    const matchScore = this.calculateMatchScore(restaurant, params);

    // Combine scores using weights
    return qualityScore * weights.quality + priceScore * weights.price + matchScore * weights.match;
  },

  calculateWeights(params: RestaurantScoringParams) {
    const weights = {
      quality: 0.4,
      price: 0.3,
      match: 0.3,
    };

    // Adjust weights based on crowd preference
    if (params.crowdPreference === 'popular') {
      weights.quality += 0.1;
      weights.match -= 0.1;
    } else if (params.crowdPreference === 'hidden') {
      weights.quality -= 0.1;
      weights.match += 0.1;
    }

    // Adjust for dietary restrictions
    if (params.dietaryRestrictions.length > 0) {
      weights.match += 0.1;
      weights.quality -= 0.1;
    }

    // Adjust for budget sensitivity
    if (params.budget === 'budget') {
      weights.price += 0.1;
      weights.quality -= 0.1;
    }

    return weights;
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

  calculatePriceScore(restaurant: ActivityRecommendation, params: RestaurantScoringParams): number {
    const budgetMap: Record<TripBudget, PriceLevel[]> = {
      budget: ['PRICE_LEVEL_FREE', 'PRICE_LEVEL_INEXPENSIVE'],
      moderate: ['PRICE_LEVEL_MODERATE'],
      luxury: ['PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE'],
    };

    // Direct budget match (0-0.6)
    let score = budgetMap[params.budget].includes(restaurant.priceLevel) ? 0.6 : 0;

    // Price preference alignment (0-0.4)
    const priceMap: Record<PriceLevel, number> = {
      PRICE_LEVEL_UNSPECIFIED: 3,
      PRICE_LEVEL_FREE: 1,
      PRICE_LEVEL_INEXPENSIVE: 2,
      PRICE_LEVEL_MODERATE: 3,
      PRICE_LEVEL_EXPENSIVE: 4,
      PRICE_LEVEL_VERY_EXPENSIVE: 5,
    };

    const priceDiff = Math.abs(priceMap[restaurant.priceLevel] - params.pricePreference);
    score += Math.max(0, 0.4 - priceDiff * 0.1);

    return score;
  },

  calculateMatchScore(restaurant: ActivityRecommendation, params: RestaurantScoringParams): number {
    let score = 0;
    const types = restaurant.placeTypes || [];

    // Dietary restrictions are highest priority (50% if no location, 40% if location provided)
    const dietaryScore = this.calculateDietaryScore(types, params.dietaryRestrictions);
    if (dietaryScore === 0 && params.dietaryRestrictions.length > 0) {
      return 0; // Immediate disqualification if dietary needs aren't met
    }
    const dietaryWeight = params.currentLocation ? 0.4 : 0.5;
    score += dietaryScore * dietaryWeight;

    // Cuisine preferences (50% if no location, 30% if location provided)
    const cuisineScore = this.calculateCuisineScore(
      types,
      params.cuisinePreferences,
      params.crowdPreference
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

  calculateDietaryScore(types: string[], restrictions: string[]): number {
    console.log(restrictions);
    if (restrictions.length === 0) return 1;

    const matches = restrictions.every(restriction => {
      switch (restriction) {
        case 'vegetarian':
          return types.some(t => t.includes('vegetarian'));
        case 'vegan':
          return types.some(t => t.includes('vegan'));
        default:
          return true;
      }
    });

    return matches ? 1 : 0;
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
      // Extract the possible cuisine value from the item (e.g., remove '_restaurant')
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
