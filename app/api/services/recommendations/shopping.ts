import { ActivityRecommendation, PriceLevel } from '@prisma/client';
import _ from 'lodash';

import { TripBudget } from '@/app/trips/[tripId]/types';
import { PlaceCategory, CategoryMapping } from '@/constants';
import { prisma } from '@/lib/db';
import { InterestType, TransportMode } from '@/lib/stores/preferences';

import { ScoringParams } from './types';

interface Location {
  latitude: number;
  longitude: number;
  address: string;
  placeId: string;
  neighborhood: string;
}

export const shoppingRecommendationService = {
  async getRecommendations(cityId: string, params: ScoringParams) {
    // Get shopping places with enhanced filtering
    const shoppingPlaces = await prisma.activityRecommendation.findMany({
      where: {
        cityId,
        businessStatus: 'OPERATIONAL',
        placeTypes: {
          hasSome: CategoryMapping[PlaceCategory.SHOPPING].includedTypes,
        },
        NOT: {
          placeTypes: {
            hasSome: [
              ...CategoryMapping[PlaceCategory.SHOPPING].excludedTypes,
              'restaurant',
              'museum',
            ],
          },
        },
        // Ensure high quality
        rating: { gte: 4.0 },
        reviewCountTier: { in: ['VERY_HIGH', 'HIGH'] },
      },
      take: 100,
    });

    // Group by name to identify chains
    const groupedByName = _.groupBy(shoppingPlaces, 'name');

    // For chains, keep only the highest rated location
    const deduplicated = Object.values(groupedByName)
      .map(group =>
        _.maxBy(group, place => place.rating * (place.reviewCountTier === 'VERY_HIGH' ? 1.2 : 1))
      )
      .filter(Boolean) as ActivityRecommendation[];

    // Score and sort shopping places
    const scored = deduplicated.map(place => ({
      ...place,
      score: this.calculateScore(place, params),
    }));

    // Filter and return top recommendations
    const recommendations = scored
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    return recommendations;
  },

  calculateScore(place: ActivityRecommendation, params: ScoringParams): number {
    const weights = this.calculateWeights(params);

    const popularityScore = this.calculatePopularityScore(place);
    const qualityScore = this.calculateQualityScore(place);
    const varietyScore = this.calculateVarietyScore(place);
    const priceScore = this.calculatePriceScore(place, params);
    const locationScore = this.calculateLocationScore(
      place.location as unknown as Location,
      params.currentLocation,
      params.transportPreferences
    );

    return (
      popularityScore * weights.popularity +
      qualityScore * weights.quality +
      varietyScore * weights.variety +
      priceScore * weights.price +
      locationScore * weights.location
    );
  },

  calculateWeights(params: ScoringParams) {
    const weights = {
      popularity: 0.25,
      quality: 0.2,
      variety: 0.2,
      price: 0.2,
      location: 0.15,
    };

    // Adjust for luxury vs budget preferences
    if (params.budget === 'luxury') {
      weights.quality += 0.1;
      weights.popularity -= 0.05;
      weights.price -= 0.05;
    } else if (params.budget === 'budget') {
      weights.quality -= 0.1;
      weights.price += 0.1;
    }

    // Adjust for crowd preferences
    if (params.crowdPreference === 'hidden') {
      weights.popularity -= 0.05;
      weights.variety += 0.05;
    }

    return weights;
  },

  calculatePopularityScore(place: ActivityRecommendation): number {
    let score = 0;

    // Rating-based scoring with higher thresholds
    if (place.rating >= 4.5) score += 0.5;
    else if (place.rating >= 4.2) score += 0.3;
    else if (place.rating >= 4.0) score += 0.1;

    // Review count consideration
    switch (place.reviewCountTier) {
      case 'VERY_HIGH':
        score += 0.5;
        break;
      case 'HIGH':
        score += 0.3;
        break;
    }

    return Math.min(1, score);
  },

  calculateQualityScore(place: ActivityRecommendation): number {
    let score = 0;

    // Price level as a quality indicator
    if (place.priceLevel === 'PRICE_LEVEL_VERY_EXPENSIVE') {
      score += 0.4;
    } else if (place.priceLevel === 'PRICE_LEVEL_EXPENSIVE') {
      score += 0.3;
    }

    // Tourist attraction status
    if (place.isTouristAttraction) {
      score += 0.3;
    }

    // Must-see designation
    if (place.isMustSee) {
      score += 0.3;
    }

    return Math.min(1, score);
  },

  calculateVarietyScore(place: ActivityRecommendation): number {
    let score = 0;

    // Venue type scoring
    if (place.placeTypes.includes('shopping_mall')) {
      score += 0.7; // Malls offer the most variety
    } else if (place.placeTypes.includes('department_store')) {
      score += 0.5; // Department stores offer good variety
    } else if (place.placeTypes.some(type => type.includes('market'))) {
      score += 0.6; // Markets offer unique variety
    }

    // Location-based variety
    const location = place.location as unknown as Location;
    if (location.neighborhood?.toLowerCase().includes('shopping')) {
      score += 0.3;
    }

    return Math.min(1, score);
  },

  calculatePriceScore(place: ActivityRecommendation, params: ScoringParams): number {
    const budgetMap: Record<TripBudget, PriceLevel[]> = {
      budget: ['PRICE_LEVEL_FREE', 'PRICE_LEVEL_INEXPENSIVE'],
      moderate: ['PRICE_LEVEL_MODERATE'],
      luxury: ['PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE'],
    };

    // Direct budget match
    let score = budgetMap[params.budget].includes(place.priceLevel) ? 0.6 : 0;

    // Price level alignment scoring
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

    const priceDiff = Math.abs(priceMap[place.priceLevel] - budgetValues[params.budget]);
    score += Math.max(0, 0.4 - priceDiff * 0.1);

    return score;
  },

  calculateLocationScore(
    location: Location,
    currentLocation?: { lat: number; lng: number },
    transportPreferences?: TransportMode[]
  ): number {
    if (!currentLocation || !transportPreferences) {
      return 0.5;
    }

    const distance = this.calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      location.latitude,
      location.longitude
    );

    // Adjust acceptable distance based on transport preferences
    let maxDistance = 1000; // Default 1km for walking
    if (transportPreferences.includes('public-transit')) {
      maxDistance = 5000;
    } else if (transportPreferences.includes('driving')) {
      maxDistance = 10000;
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

    return R * c;
  },
};
