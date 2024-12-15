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

export const spaWellnessRecommendationService = {
  async getRecommendations(cityId: string, params: ScoringParams) {
    // Get spa and wellness activities
    const activities = await prisma.activityRecommendation.findMany({
      where: {
        cityId,
        businessStatus: 'OPERATIONAL',
        primaryType: {
          in: ['spa', 'wellness_center'],
        },
        seasonalAvailability: SeasonalAvailability.ALL_YEAR,
      },
    });

    // Score activities
    const scored = activities.map(activity => ({
      ...activity,
      score: this.calculateScore(activity, params),
    }));

    // Sort by score and return top recommendations
    const recommendations = scored
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return recommendations;
  },

  calculateScore(activity: ActivityRecommendation, params: ScoringParams): number {
    const weights = this.calculateWeights(params);

    const qualityScore = this.calculateQualityScore(activity);
    const luxuryScore = this.calculateLuxuryScore(activity);
    const priceScore = this.calculatePriceScore(activity, params);
    const locationScore = this.calculateLocationScore(
      activity.location as unknown as Location,
      params.currentLocation,
      params.transportPreferences
    );
    const energyAlignmentScore = this.calculateEnergyAlignmentScore(activity, params.energyLevel);

    return (
      qualityScore * weights.quality +
      luxuryScore * weights.luxury +
      priceScore * weights.price +
      locationScore * weights.location +
      energyAlignmentScore * weights.energyAlignment
    );
  },

  calculateWeights(params: ScoringParams) {
    const weights = {
      quality: 0.3, // Rating and review quality
      luxury: 0.2, // Luxury indicators and amenities
      price: 0.2, // Price alignment
      location: 0.15, // Accessibility
      energyAlignment: 0.15, // Match with energy preferences
    };

    // Adjust weights based on budget preference
    if (params.budget === 'luxury') {
      weights.luxury += 0.05;
      weights.price -= 0.05;
    } else if (params.budget === 'budget') {
      weights.luxury -= 0.05;
      weights.price += 0.05;
    }

    // Adjust for crowd preference
    if (params.crowdPreference === 'hidden') {
      weights.quality -= 0.05;
      weights.location += 0.05;
    }

    return weights;
  },

  calculateQualityScore(activity: ActivityRecommendation): number {
    let score = 0;

    // Base score from rating tier
    switch (activity.ratingTier) {
      case 'EXCEPTIONAL':
        score += 0.5;
        break;
      case 'HIGH':
        score += 0.3;
        break;
      case 'AVERAGE':
        score += 0.2;
        break;
    }

    // Review count consideration
    switch (activity.reviewCountTier) {
      case 'VERY_HIGH':
        score += 0.5;
        break;
      case 'HIGH':
        score += 0.3;
        break;
      case 'MODERATE':
        score += 0.2;
        break;
    }

    return Math.min(1, score);
  },

  calculateLuxuryScore(activity: ActivityRecommendation): number {
    let score = 0;

    // Price level as luxury indicator
    switch (activity.priceLevel) {
      case 'PRICE_LEVEL_VERY_EXPENSIVE':
        score += 0.4;
        break;
      case 'PRICE_LEVEL_EXPENSIVE':
        score += 0.3;
        break;
      case 'PRICE_LEVEL_MODERATE':
        score += 0.2;
        break;
    }

    // Spa type consideration
    if (activity.placeTypes.includes('spa')) {
      score += 0.3;
    }
    if (activity.placeTypes.includes('beauty_salon')) {
      score += 0.2;
    }
    if (activity.placeTypes.includes('massage')) {
      score += 0.2;
    }

    return Math.min(1, score);
  },

  calculatePriceScore(activity: ActivityRecommendation, params: ScoringParams): number {
    // For free activities, give high score if budget conscious
    if (activity.priceLevel === 'PRICE_LEVEL_FREE') {
      return params.budget === 'budget' ? 1 : 0.6;
    }

    const budgetMap: Record<TripBudget, PriceLevel[]> = {
      budget: ['PRICE_LEVEL_FREE', 'PRICE_LEVEL_INEXPENSIVE'],
      moderate: ['PRICE_LEVEL_MODERATE'],
      luxury: ['PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE'],
    };

    // Direct budget match
    let score = budgetMap[params.budget].includes(activity.priceLevel) ? 0.6 : 0;

    // Price level alignment
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

    const priceDiff = Math.abs(priceMap[activity.priceLevel] - budgetValues[params.budget]);
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

  calculateEnergyAlignmentScore(activity: ActivityRecommendation, energyLevel: number): number {
    // For spa activities, we generally want to align with lower energy preferences
    // as they're typically relaxation-focused

    const activityTypes = new Set(activity.placeTypes);
    let baseIntensity = 0;

    // Determine base intensity of the activity
    if (activityTypes.has('gym') || activityTypes.has('fitness_center')) {
      baseIntensity = 0.8; // High intensity
    } else if (activityTypes.has('yoga') || activityTypes.has('pilates')) {
      baseIntensity = 0.5; // Medium intensity
    } else {
      baseIntensity = 0.2; // Low intensity (typical spa services)
    }

    // Calculate score based on how well the activity intensity matches the user's energy level
    const userEnergyNormalized = (energyLevel - 1) / 2; // Convert 1-3 to 0-1 scale
    const intensityDiff = Math.abs(baseIntensity - userEnergyNormalized);

    return Math.max(0, 1 - intensityDiff);
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
