import { ActivityRecommendation, PriceLevel, SeasonalAvailability } from '@prisma/client';
import _ from 'lodash';

import { ParsedItineraryActivity, TripBudget } from '@/app/trips/[tripId]/types';
import { prisma } from '@/lib/db';
import { EnergyLevel } from '@/lib/stores/preferences';

import { DEFAULT_PAGE_SIZE, LocationContext, PaginationParams, ScoringParams } from './types';

interface Location {
  latitude: number;
  longitude: number;
  address: string;
  placeId: string;
  neighborhood: string;
}

export const spaWellnessRecommendationService = {
  async getRecommendations(params: ScoringParams, pagination: PaginationParams) {
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE } = pagination;

    const { cityId } = params;

    const locationContext = params.locationContext;

    // Calculate activity clusters if we have selected activities and are in planning phase
    if (params.phase === 'planning' && params.selectedActivities?.length > 0) {
      locationContext.clusters = this.calculateActivityClusters(params.selectedActivities);
    }

    // Get spa and wellness activities
    const activities = await prisma.activityRecommendation.findMany({
      where: {
        cityId,
        businessStatus: 'OPERATIONAL',
        primaryType: {
          in: ['spa', 'wellness_center', 'sauna'],
        },
        seasonalAvailability: SeasonalAvailability.ALL_YEAR,
      },
    });

    // Score and sort activities
    const scoredAndSorted = activities
      .map(activity => ({
        ...activity,
        score: this.calculateScore(activity, params),
      }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score);

    // Calculate pagination
    const total = scoredAndSorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePageNumber = Math.min(Math.max(1, page), totalPages);

    // Get the correct slice of data
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

  calculateActivityClusters(
    activities: ParsedItineraryActivity[]
  ): Array<{ center: { latitude: number; longitude: number }; radius: number }> {
    if (activities.length < 2) return [];

    // Get locations from activities
    const locations = activities.map(a => ({
      latitude: a.recommendation.location.latitude,
      longitude: a.recommendation.location.longitude,
    }));

    // Create a single cluster centered on the mean location
    const center = {
      latitude: _.meanBy(locations, 'latitude'),
      longitude: _.meanBy(locations, 'longitude'),
    };

    // Calculate radius based on standard deviation of distances
    const distances = locations.map(loc =>
      this.calculateDistance(center.latitude, center.longitude, loc.latitude, loc.longitude)
    );

    const mean = _.mean(distances);
    const squareDiffs = distances.map(value => {
      const diff = value - mean;
      return diff * diff;
    });
    const standardDeviation = Math.sqrt(_.mean(squareDiffs));

    // Larger radius for spas as they can be destination venues
    const radius = Math.max(
      3000, // 3km minimum radius
      mean + standardDeviation
    );

    return [{ center, radius }];
  },

  calculateScore(activity: ActivityRecommendation, params: ScoringParams): number {
    const weights = this.calculateWeights(params);

    const qualityScore = this.calculateQualityScore(activity);
    const luxuryScore = this.calculateLuxuryScore(activity);
    const priceScore = this.calculatePriceScore(activity, params);
    const locationScore = this.calculateLocationScore(
      activity.location as unknown as Location,
      params.locationContext
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
    // Adjusted base weights
    const weights = {
      quality: 0.3,
      luxury: 0.2,
      price: 0.15, // Reduced from 0.2
      location: 0.2, // Increased from 0.15
      energyAlignment: 0.15,
    };

    // Phase-based adjustments
    if (params.phase === 'active') {
      weights.location += 0.05;
      weights.luxury -= 0.05;
    }

    // Budget-based adjustments
    if (params.budget === 'luxury') {
      weights.luxury += 0.05;
      weights.price -= 0.05;
    } else if (params.budget === 'budget') {
      weights.luxury -= 0.05;
      weights.price += 0.05;
    }

    // Crowd preference adjustments
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

  calculateLocationScore(location: Location, context: LocationContext): number {
    let score = 0;

    switch (context.type) {
      case 'city_center': {
        // Spas can be well-distributed throughout the city
        const distance = this.calculateDistance(
          context.reference.latitude,
          context.reference.longitude,
          location.latitude,
          location.longitude
        );

        // More forgiving distance tiers for spas
        if (distance <= 2000)
          score = 1.0; // Core area
        else if (distance <= 5000)
          score = 0.8; // Urban accessible
        else if (distance <= 10000)
          score = 0.6; // Wider city area
        else score = 0.4; // Remote but still viable
        break;
      }

      case 'current_location': {
        const distance = this.calculateDistance(
          context.reference.latitude,
          context.reference.longitude,
          location.latitude,
          location.longitude
        );

        // Gentler distance decay for spas
        if (distance <= 2000) {
          score = 1.0; // Very convenient
        } else if (distance <= 10000) {
          // Gradual decay over longer distance
          score = 0.8 * (1 - (distance - 2000) / 8000);
        } else {
          // Long distance but still accessible
          score = Math.max(0.2, 0.4 * (1 - (distance - 10000) / 10000));
        }
        break;
      }

      case 'activity_cluster': {
        if (!context.clusters?.length) {
          score = 0.5; // Neutral score if no clusters
          break;
        }

        // Find the closest cluster and score based on proximity
        const clusterScores = context.clusters.map(cluster => {
          const distanceToCluster = this.calculateDistance(
            cluster.center.latitude,
            cluster.center.longitude,
            location.latitude,
            location.longitude
          );

          // More forgiving cluster proximity for spas
          if (distanceToCluster <= cluster.radius * 0.5) {
            return 1.0; // Premium for close proximity
          } else if (distanceToCluster <= cluster.radius) {
            return 0.8; // Strong score within radius
          } else {
            // Gradual decay outside cluster
            return Math.max(0.3, 0.8 - (distanceToCluster - cluster.radius) / 5000);
          }
        });

        // Take the highest cluster score
        score = Math.max(...clusterScores);
        break;
      }
    }

    return score;
  },

  calculateEnergyAlignmentScore(
    activity: ActivityRecommendation,
    energyLevel: EnergyLevel
  ): number {
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
    const userEnergyNormalized = ((energyLevel ?? 1) - 1) / 2; // Convert 1-3 to 0-1 scale
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
