import { ActivityRecommendation, PriceLevel } from '@prisma/client';

import { ParsedItineraryActivity, TripBudget } from '@/app/trips/[tripId]/types';
import { PlaceCategory, CategoryMapping } from '@/constants';
import { prisma } from '@/lib/db';
import { InterestType, TransportMode } from '@/lib/stores/preferences';
import _ from 'lodash';

import { DEFAULT_PAGE_SIZE, LocationContext, PaginationParams, ScoringParams } from './types';
interface Location {
  latitude: number;
  longitude: number;
  address: string;
  placeId: string;
  neighborhood: string;
}

export const museumRecommendationService = {
  async getRecommendations(params: ScoringParams, pagination: PaginationParams) {
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE } = pagination;
    const { cityId } = params;

    let locationContext = params.locationContext;

    // Calculate activity clusters if we have selected activities and are in planning phase
    if (params.phase === 'planning' && params.selectedActivities?.length > 0) {
      locationContext.clusters = this.calculateActivityClusters(params.selectedActivities);
    }

    // Get initial set of museums
    const museums = await prisma.activityRecommendation.findMany({
      where: {
        cityId,
        businessStatus: 'OPERATIONAL',
        placeTypes: {
          hasSome: CategoryMapping[PlaceCategory.MUSEUM].includedTypes,
        },
        NOT: {
          placeTypes: {
            hasSome: ['restaurant', 'amusement_center'],
          },
        },
      },
    });

    // Score and sort museums
    const scoredAndSorted = museums
      .map(museum => ({
        ...museum,
        score: this.calculateScore(museum, params),
      }))
      .filter(m => m.score > 0)
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
      latitude: (a.recommendation.location as any).latitude,
      longitude: (a.recommendation.location as any).longitude,
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

    const radius = Math.max(
      2000, // Minimum 2km radius
      mean + standardDeviation
    );

    return [{ center, radius }];
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
      params.locationContext
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
    // Adjusted base weights for museums
    const weights = {
      quality: 0.3,
      interest: 0.25,
      activityFit: 0.2,
      price: 0.15,
      location: 0.1,
    };

    // Adjust weights based on phase
    if (params.phase === 'active') {
      weights.location += 0.05;
      weights.quality -= 0.05;
    }

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

  calculateLocationScore(location: Location, context: LocationContext): number {
    let score = 0;

    switch (context.type) {
      case 'city_center': {
        // Museums often cluster near city centers
        const distance = this.calculateDistance(
          context.reference.latitude,
          context.reference.longitude,
          location.latitude,
          location.longitude
        );

        // Score based on zones with higher weights for museums near center
        if (distance <= 2000) score = 1.0;
        else if (distance <= 4000)
          score = 0.8; // Higher mid-range score for museums
        else if (distance <= 6000) score = 0.6;
        else score = 0.3;
        break;
      }

      case 'current_location': {
        const distance = this.calculateDistance(
          context.reference.latitude,
          context.reference.longitude,
          location.latitude,
          location.longitude
        );

        // Museums typically require dedicated trips, so use a gentler distance decay
        score = Math.max(0, 1 - distance / 8000); // 8km radius for museums
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
          // Museums can be slightly further from clusters
          return Math.max(0, 1 - distanceToCluster / (cluster.radius * 1.5));
        });

        // Take the highest cluster score
        score = Math.max(...clusterScores);
        break;
      }
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
