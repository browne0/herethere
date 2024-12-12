import { ActivityRecommendation, PriceLevel } from '@prisma/client';
import _ from 'lodash';

import { prisma } from '@/lib/db';
import { Cuisine } from '@/lib/stores/preferences';

export type TripBudget = 'budget' | 'moderate' | 'luxury';

export interface MustSeeScoringParams {
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

export const essentialExperiencesRecommendationService = {
  async getRecommendations(cityId: string, params: MustSeeScoringParams) {
    // 1. Get initial set of must-see attractions
    const attractions = await prisma.activityRecommendation.findMany({
      where: {
        cityId,
        businessStatus: 'OPERATIONAL',
        NOT: {
          placeTypes: {
            has: 'restaurant', // Exclude food-related places
          },
        },
        OR: [
          { isMustSee: true },
          { isTouristAttraction: true },
          {
            placeTypes: {
              hasSome: [
                'tourist_attraction',
                'point_of_interest',
                'landmark',
                'monument',
                'museum',
              ],
            },
          },
        ],
      },
      take: 50,
    });

    // 2. Score attractions
    const scored = attractions.map(attraction => ({
      ...attraction,
      score: this.calculateScore(attraction, params),
    }));

    // 3. Sort by score and return top recommendations
    const recommendations = scored
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    console.log(recommendations);
    return recommendations;
  },

  calculateScore(attraction: ActivityRecommendation, params: MustSeeScoringParams): number {
    // Calculate weights based on user preferences
    const weights = this.calculateWeights(params);

    // Calculate individual scores
    const qualityScore = this.calculateQualityScore(attraction);
    const priceScore = this.calculatePriceScore(attraction, params);
    const popularityScore = this.calculatePopularityScore(attraction, params.crowdPreference);
    const locationScore = this.calculateLocationScore(attraction, params);
    const mustSeeScore = this.calculateMustSeeScore(attraction);

    // Combine scores using weights
    return (
      qualityScore * weights.quality +
      priceScore * weights.price +
      popularityScore * weights.popularity +
      locationScore * weights.location +
      mustSeeScore * weights.mustSee
    );
  },

  calculateWeights(params: MustSeeScoringParams) {
    const weights = {
      quality: 0.25,
      price: 0.15,
      popularity: 0.25,
      location: 0.15,
      mustSee: 0.2, // Higher weight for must-see status compared to restaurants
    };

    // Adjust weights based on crowd preference
    if (params.crowdPreference === 'popular') {
      weights.popularity += 0.05;
      weights.location -= 0.05;
    } else if (params.crowdPreference === 'hidden') {
      weights.popularity -= 0.05;
      weights.location += 0.05;
    }

    // Adjust for budget sensitivity
    if (params.budget === 'budget') {
      weights.price += 0.05;
      weights.quality -= 0.05;
    }

    return weights;
  },

  calculateQualityScore(attraction: ActivityRecommendation): number {
    let score = 0;

    // Rating Quality (0-0.6)
    switch (attraction.ratingTier) {
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
    switch (attraction.reviewCountTier) {
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

  calculatePriceScore(attraction: ActivityRecommendation, params: MustSeeScoringParams): number {
    // For free attractions, give high score if budget conscious
    if (attraction.priceLevel === 'PRICE_LEVEL_FREE') {
      return params.budget === 'budget' ? 1 : 0.8;
    }

    const budgetMap: Record<TripBudget, PriceLevel[]> = {
      budget: ['PRICE_LEVEL_FREE', 'PRICE_LEVEL_INEXPENSIVE'],
      moderate: ['PRICE_LEVEL_MODERATE'],
      luxury: ['PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE'],
    };

    // Direct budget match (0-0.6)
    let score = budgetMap[params.budget].includes(attraction.priceLevel) ? 0.6 : 0;

    // Price preference alignment (0-0.4)
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

    const priceDiff = Math.abs(priceMap[attraction.priceLevel] - budgetValues[params.budget]);
    score += Math.max(0, 0.4 - priceDiff * 0.1);

    return score;
  },

  calculatePopularityScore(
    attraction: ActivityRecommendation,
    crowdPreference: 'popular' | 'hidden' | 'mixed'
  ): number {
    let score = 0;

    // Base popularity from review count and rating
    if (attraction.reviewCountTier === 'VERY_HIGH' && attraction.ratingTier === 'EXCEPTIONAL') {
      score = 1;
    } else if (
      attraction.reviewCountTier === 'HIGH' ||
      (attraction.reviewCountTier === 'MODERATE' && attraction.ratingTier === 'HIGH')
    ) {
      score = 0.8;
    } else if (attraction.reviewCountTier === 'MODERATE') {
      score = 0.6;
    } else {
      score = 0.4;
    }

    // Adjust based on crowd preference
    if (crowdPreference === 'hidden') {
      score = 1 - score; // Invert the score for those seeking hidden gems
    } else if (crowdPreference === 'mixed') {
      score = 0.5 + (score - 0.5) * 0.5; // Moderate the extremes
    }

    return score;
  },

  calculateLocationScore(attraction: ActivityRecommendation, params: MustSeeScoringParams): number {
    if (!params.currentLocation || !attraction.location) {
      return 0.5; // Neutral score if location data is missing
    }

    const location = attraction.location as unknown as Location;
    const distance = this.calculateDistance(
      params.currentLocation.lat,
      params.currentLocation.lng,
      location.latitude,
      location.longitude
    );

    // Adjust acceptable distance based on transport preferences
    let maxDistance = 1000; // Default 1km for walking
    if (params.transportPreferences.includes('public_transit')) {
      maxDistance = 5000; // 5km for public transit
    } else if (params.transportPreferences.includes('driving')) {
      maxDistance = 10000; // 10km for driving
    }

    return Math.max(0, 1 - distance / maxDistance);
  },

  calculateMustSeeScore(attraction: ActivityRecommendation): number {
    let score = 0;

    if (attraction.isMustSee) {
      score += 0.6;
    }

    if (attraction.isTouristAttraction) {
      score += 0.4;
    }

    // Bonus for significant landmarks
    if (attraction.placeTypes.includes('landmark') || attraction.placeTypes.includes('monument')) {
      score = Math.min(1, score + 0.2);
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
