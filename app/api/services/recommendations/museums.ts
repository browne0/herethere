import { ActivityRecommendation, PriceLevel } from '@prisma/client';

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

export const museumRecommendationService = {
  async getRecommendations(cityId: string, params: ScoringParams) {
    // 1. Get initial set of museums
    const museums = await prisma.activityRecommendation.findMany({
      where: {
        cityId,
        businessStatus: 'OPERATIONAL',
        placeTypes: {
          hasSome: CategoryMapping[PlaceCategory.MUSEUM].includedTypes,
        },
        NOT: {
          placeTypes: {
            hasSome: ['restaurant', 'amusement_center'], // Exclude restaurants
          },
        },
      },
      take: 50,
    });

    // 2. Score museums
    const scored = museums.map(museum => ({
      ...museum,
      score: this.calculateScore(museum, params),
    }));

    // 3. Sort by score and filter out low scores
    const recommendations = scored
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    return recommendations;
  },

  getPlaceTypesFromInterests(interests: InterestType[]): string[] {
    const placeTypes = new Set<string>();

    interests.forEach(interest => {
      switch (interest) {
        case 'arts':
        case 'history':
          CategoryMapping[PlaceCategory.MUSEUM].includedTypes.forEach(type => placeTypes.add(type));
          break;
        case 'photography':
          placeTypes.add('art_gallery');
          break;
      }
    });

    return Array.from(placeTypes);
  },

  calculateScore(museum: ActivityRecommendation, params: ScoringParams): number {
    const weights = this.calculateWeights(params);

    const qualityScore = this.calculateQualityScore(museum);
    const interestScore = this.calculateInterestScore(museum, params.interests);
    const activityFitScore = this.calculateActivityFitScore(museum, params);
    const priceScore = this.calculatePriceScore(museum, params);
    const locationScore = this.calculateLocationScore(
      museum.location as unknown as Location,
      params.currentLocation,
      params.transportPreferences
    );

    return (
      qualityScore * weights.quality +
      interestScore * weights.interest +
      activityFitScore * weights.activityFit +
      priceScore * weights.price +
      locationScore * weights.location
    );
  },

  calculateWeights(params: ScoringParams) {
    const weights = {
      quality: 0.3, // Base on reviews and ratings
      interest: 0.25, // Match to user interests
      activityFit: 0.2, // Energy level and crowd preference
      price: 0.15, // Budget alignment
      location: 0.1, // Accessibility
    };

    // Adjust weights based on crowd preference
    if (params.crowdPreference === 'popular') {
      weights.quality += 0.05;
      weights.location -= 0.05;
    } else if (params.crowdPreference === 'hidden') {
      weights.quality -= 0.05;
      weights.interest += 0.05;
    }

    // Adjust for budget sensitivity
    if (params.budget === 'budget') {
      weights.price += 0.05;
      weights.quality -= 0.05;
    }

    return weights;
  },

  calculateQualityScore(museum: ActivityRecommendation): number {
    let score = 0;

    // Rating Quality (0-0.6)
    switch (museum.ratingTier) {
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
    switch (museum.reviewCountTier) {
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

  calculateInterestScore(museum: ActivityRecommendation, interests: InterestType[]): number {
    const relevantTypes = this.getPlaceTypesFromInterests(interests);
    const matchingTypes = museum.placeTypes.filter(type => relevantTypes.includes(type));

    // Calculate base score from type matches
    let score = matchingTypes.length / Math.max(relevantTypes.length, 1);

    // Boost score for key museum types
    if (museum.placeTypes.includes('art_gallery') && interests.includes('arts')) {
      score = Math.min(1, score + 0.2);
    }
    if (museum.placeTypes.includes('history_museum') && interests.includes('history')) {
      score = Math.min(1, score + 0.2);
    }

    return score;
  },

  calculateActivityFitScore(museum: ActivityRecommendation, params: ScoringParams): number {
    let score = 0;

    // Museums are naturally low-intensity activities
    switch (params.energyLevel) {
      case 1: // Light & Easy - perfect for museums
        score += 0.4;
        break;
      case 2: // Moderate - good for museums
        score += 0.3;
        break;
      case 3: // Very Active - less ideal
        score += 0.2;
        break;
    }

    // Review quality (0-0.3)
    switch (museum.ratingTier) {
      case 'EXCEPTIONAL':
        score += 0.3;
        break;
      case 'HIGH':
        score += 0.2;
        break;
      case 'AVERAGE':
        score += 0.1;
        break;
    }

    // Crowd level alignment (0-0.3)
    const popularityScore =
      museum.reviewCountTier === 'VERY_HIGH'
        ? 1
        : museum.reviewCountTier === 'HIGH'
          ? 0.7
          : museum.reviewCountTier === 'MODERATE'
            ? 0.4
            : 0.2;

    if (params.crowdPreference === 'popular') {
      score += 0.3 * popularityScore;
    } else if (params.crowdPreference === 'hidden') {
      score += 0.3 * (1 - popularityScore);
    } else {
      score += 0.15; // Neutral score for mixed preference
    }

    return score;
  },

  calculatePriceScore(museum: ActivityRecommendation, params: ScoringParams): number {
    // For free museums, give high score if budget conscious
    if (museum.priceLevel === 'PRICE_LEVEL_FREE') {
      return params.budget === 'budget' ? 1.2 : 1.0; // Bonus for free museums
    }

    const budgetMap: Record<TripBudget, PriceLevel[]> = {
      budget: ['PRICE_LEVEL_FREE', 'PRICE_LEVEL_INEXPENSIVE'],
      moderate: ['PRICE_LEVEL_MODERATE'],
      luxury: ['PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE'],
    };

    // Perfect budget match
    if (budgetMap[params.budget].includes(museum.priceLevel)) {
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
      budget: 1.5,
      moderate: 3,
      luxury: 4.5,
    };

    const priceDiff = Math.abs(priceMap[museum.priceLevel] - budgetValues[params.budget]);
    return Math.max(0, 1 - priceDiff * 0.25);
  },

  calculateLocationScore(
    location: Location,
    currentLocation?: { lat: number; lng: number },
    transportPreferences?: TransportMode[]
  ): number {
    if (!currentLocation || !transportPreferences) {
      return 0.5; // Neutral score if no location context
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
      maxDistance = 3000; // 3km for public transit
    } else if (transportPreferences.includes('driving')) {
      maxDistance = 8000; // 8km for driving
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
