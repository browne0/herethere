import { ActivityRecommendation, PriceLevel, SeasonalAvailability } from '@prisma/client';
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

export const essentialExperiencesRecommendationService = {
  async getRecommendations(cityId: string, params: ScoringParams) {
    const relevantTypes = this.getPlaceTypesFromInterests(params.interests);

    // 1. Get initial set of must-see attractions
    const attractions = await prisma.activityRecommendation.findMany({
      where: {
        cityId,
        businessStatus: 'OPERATIONAL',
        NOT: {
          placeTypes: {
            has: 'restaurant', // Exclude restaurants
          },
        },
        OR: [
          { isMustSee: true },
          { isTouristAttraction: true },
          {
            placeTypes: {
              hasSome: relevantTypes,
            },
          },
        ],
        // Only show seasonally appropriate activities
        seasonalAvailability: SeasonalAvailability.ALL_YEAR,
      },
      take: 100,
    });

    // 2. Score attractions
    const scored = attractions.map(attraction => ({
      ...attraction,
      score: this.calculateScore(attraction, params),
    }));

    // 3. Sort by score and filter out low scores
    const recommendations = scored
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    return recommendations;
  },

  getPlaceTypesFromInterests(interests: InterestType[]): string[] {
    const placeTypes = new Set<string>();

    interests.forEach(interest => {
      switch (interest) {
        case 'outdoors':
          CategoryMapping[PlaceCategory.PARK].includedTypes.forEach(type => placeTypes.add(type));
          CategoryMapping[PlaceCategory.BEACH].includedTypes.forEach(type => placeTypes.add(type));
          break;
        case 'arts':
          CategoryMapping[PlaceCategory.MUSEUM].includedTypes.forEach(type => placeTypes.add(type));
          break;
        case 'history':
          CategoryMapping[PlaceCategory.HISTORIC].includedTypes.forEach(type =>
            placeTypes.add(type)
          );
          CategoryMapping[PlaceCategory.MUSEUM].includedTypes.forEach(type => placeTypes.add(type));
          break;
        case 'entertainment':
          CategoryMapping[PlaceCategory.ATTRACTION].includedTypes.forEach(type =>
            placeTypes.add(type)
          );
          break;
        case 'photography':
          CategoryMapping[PlaceCategory.ATTRACTION].includedTypes.forEach(type =>
            placeTypes.add(type)
          );
          CategoryMapping[PlaceCategory.HISTORIC].includedTypes.forEach(type =>
            placeTypes.add(type)
          );
          CategoryMapping[PlaceCategory.PARK].includedTypes.forEach(type => placeTypes.add(type));
          break;
      }
    });

    // Always include essential tourist types for must-see attractions
    CategoryMapping[PlaceCategory.ATTRACTION].includedTypes.forEach(type => placeTypes.add(type));
    CategoryMapping[PlaceCategory.HISTORIC].includedTypes.forEach(type => placeTypes.add(type));

    return Array.from(placeTypes);
  },

  getActivityIntensityScore(placeTypes: string[]): number {
    // Define activity types by intensity
    const highIntensityTypes = new Set([
      'hiking_trail',
      'amusement_park',
      'zoo',
      'aquarium',
      'sports_complex',
      'beach',
    ]);

    const moderateIntensityTypes = new Set(['park', 'garden', 'tourist_attraction']);

    const lowIntensityTypes = new Set([
      'museum',
      'art_gallery',
      'monument',
      'historic_site',
      'church',
      'temple',
      'observation_deck',
    ]);

    // Count matches in each category
    const highCount = placeTypes.filter(type => highIntensityTypes.has(type)).length;
    const moderateCount = placeTypes.filter(type => moderateIntensityTypes.has(type)).length;
    const lowCount = placeTypes.filter(type => lowIntensityTypes.has(type)).length;

    // Calculate weighted score (0-1 scale)
    const total = highCount + moderateCount + lowCount || 1; // Avoid division by zero
    return (highCount * 1 + moderateCount * 0.6 + lowCount * 0.3) / total;
  },

  calculateScore(attraction: ActivityRecommendation, params: ScoringParams): number {
    const weights = this.calculateWeights(params);

    const mustSeeScore = this.calculateMustSeeScore(attraction);
    const interestScore = this.calculateInterestScore(attraction, params.interests);
    const activityFitScore = this.calculateActivityFitScore(attraction, params);
    const priceScore = this.calculatePriceScore(attraction, params);
    const locationScore = this.calculateLocationScore(
      attraction.location as unknown as Location,
      params.currentLocation,
      params.transportPreferences
    );

    return (
      mustSeeScore * weights.mustSee +
      interestScore * weights.interest +
      activityFitScore * weights.activityFit +
      priceScore * weights.price +
      locationScore * weights.location
    );
  },

  calculateWeights(params: ScoringParams) {
    const weights = {
      mustSee: 0.3, // Must-see status is primary for this service
      interest: 0.25, // Interest match is important but secondary
      activityFit: 0.2, // Activity characteristics
      price: 0.15, // Price considerations
      location: 0.1, // Location/accessibility
    };

    // Adjust weights based on crowd preference
    if (params.crowdPreference === 'popular') {
      weights.mustSee += 0.05;
      weights.location -= 0.05;
    } else if (params.crowdPreference === 'hidden') {
      weights.mustSee -= 0.05;
      weights.interest += 0.05;
    }

    // Adjust for budget sensitivity
    if (params.budget === 'budget') {
      weights.price += 0.05;
      weights.activityFit -= 0.05;
    }

    return weights;
  },

  calculateMustSeeScore(attraction: ActivityRecommendation): number {
    let score = 0;

    // Core must-see factors
    if (attraction.isMustSee) {
      score += 0.6;
    }
    if (attraction.isTouristAttraction) {
      score += 0.3;
    }

    // Bonus for significant landmarks or high ratings
    if (attraction.placeTypes.includes('landmark') || attraction.placeTypes.includes('monument')) {
      score = Math.min(1, score + 0.2);
    }
    if (attraction.ratingTier === 'EXCEPTIONAL' && attraction.reviewCountTier === 'VERY_HIGH') {
      score = Math.min(1, score + 0.1);
    }

    return score;
  },

  calculateInterestScore(attraction: ActivityRecommendation, interests: InterestType[]): number {
    const relevantTypes = this.getPlaceTypesFromInterests(interests);
    const matchingTypes = attraction.placeTypes.filter(type => relevantTypes.includes(type));

    // Calculate base score from type matches
    let score = matchingTypes.length / Math.max(relevantTypes.length, 1);

    // Boost score for highly rated attractions within matching types
    if (matchingTypes.length > 0) {
      if (attraction.ratingTier === 'EXCEPTIONAL') score = Math.min(1, score + 0.2);
      else if (attraction.ratingTier === 'HIGH') score = Math.min(1, score + 0.1);
    }

    return score;
  },

  calculateActivityFitScore(attraction: ActivityRecommendation, params: ScoringParams): number {
    let score = 0;

    // Activity intensity fit (0-0.4)
    const activityIntensity = this.getActivityIntensityScore(attraction.placeTypes);
    let intensityScore = 0;

    switch (params.energyLevel) {
      case 1: // Light & Easy - prefer low intensity
        intensityScore = 0.4 * (1 - activityIntensity);
        break;
      case 2: // Moderate - prefer medium intensity
        intensityScore = 0.4 * (1 - Math.abs(0.5 - activityIntensity));
        break;
      case 3: // Very Active - prefer high intensity
        intensityScore = 0.4 * activityIntensity;
        break;
    }

    // Review quality (0-0.3)
    switch (attraction.ratingTier) {
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
      attraction.reviewCountTier === 'VERY_HIGH'
        ? 1
        : attraction.reviewCountTier === 'HIGH'
          ? 0.7
          : attraction.reviewCountTier === 'MODERATE'
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

  calculatePriceScore(attraction: ActivityRecommendation, params: ScoringParams): number {
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

    const priceDiff = Math.abs(priceMap[attraction.priceLevel] - budgetValues[params.budget]);
    score += Math.max(0, 0.4 - priceDiff * 0.1);

    return score;
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
      maxDistance = 5000; // 5km for public transit
    } else if (transportPreferences.includes('driving')) {
      maxDistance = 10000; // 10km for driving
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
