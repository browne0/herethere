import { ActivityRecommendation, PriceLevel, SeasonalAvailability } from '@prisma/client';
import _ from 'lodash';

import { ParsedItineraryActivity, TripBudget } from '@/app/trips/[tripId]/types';
import { PlaceCategory, CategoryMapping } from '@/constants';
import { prisma } from '@/lib/db';
import { InterestType, TransportMode } from '@/lib/stores/preferences';

import { DEFAULT_PAGE_SIZE, LocationContext, PaginationParams, ScoringParams } from './types';
interface Location {
  latitude: number;
  longitude: number;
  address: string;
  placeId: string;
  neighborhood: string;
}

export const touristAttractionService = {
  async getRecommendations(params: ScoringParams, pagination: PaginationParams) {
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE } = pagination;
    const { cityId } = params;
    const relevantTypes = this.getPlaceTypesFromInterests(params.interests);

    const locationContext = params.locationContext;

    // Calculate activity clusters if we have selected activities and are in planning phase
    if (params.phase === 'planning' && params.selectedActivities?.length > 0) {
      locationContext.clusters = this.calculateActivityClusters(params.selectedActivities);
    }

    // Get initial set of tourist attractions matching interests
    const attractions = await prisma.activityRecommendation.findMany({
      where: {
        cityId,
        businessStatus: 'OPERATIONAL',
        NOT: {
          placeTypes: {
            hasSome: ['restaurant', 'event_venue'],
          },
        },
        placeTypes: {
          hasSome: relevantTypes,
        },
        duration: {
          lte: this.getMaxDurationForEnergy(params.energyLevel),
        },
        seasonalAvailability: SeasonalAvailability.ALL_YEAR,
      },
    });

    // Score and sort attractions
    const scoredAndSorted = attractions
      .map(attraction => ({
        ...attraction,
        score: this.calculateScore(attraction, params),
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

    // Always include essential tourist types
    CategoryMapping[PlaceCategory.ATTRACTION].includedTypes.forEach(type => placeTypes.add(type));
    CategoryMapping[PlaceCategory.HISTORIC].includedTypes.forEach(type => placeTypes.add(type));

    return Array.from(placeTypes);
  },

  getMaxDurationForEnergy(energyLevel: 1 | 2 | 3): number {
    // Base duration is 3 hours (180 minutes)
    const baseDuration = 180;

    // Energy level multipliers
    const energyMultiplier = {
      1: 0.7, // Lower energy = max ~2 hours
      2: 1.0, // Normal energy = max 3 hours
      3: 1.3, // High energy = max ~4 hours
    };

    return baseDuration * energyMultiplier[energyLevel];
  },

  calculateScore(attraction: ActivityRecommendation, params: ScoringParams): number {
    const weights = this.calculateWeights(params);

    const interestScore = this.calculateInterestScore(attraction, params.interests);
    const activityFitScore = this.calculateActivityFitScore(attraction, params);
    const priceScore = this.calculatePriceScore(attraction, params);
    const locationScore = this.calculateLocationScore(
      attraction.location as unknown as Location,
      params.locationContext
    );

    return (
      interestScore * weights.interest +
      activityFitScore * weights.activityFit +
      priceScore * weights.price +
      locationScore * weights.location
    );
  },

  calculateWeights(params: ScoringParams) {
    // Base weights adjusted for location context
    const weights = {
      interest: 0.35,
      activityFit: 0.25,
      price: 0.2,
      location: 0.2, // Increased importance of location
    };

    // Adjust weights based on phase
    if (params.phase === 'active') {
      weights.location += 0.05;
      weights.interest -= 0.05;
    }

    // Adjust weights based on crowd preference
    if (params.crowdPreference === 'popular') {
      weights.interest += 0.05;
      weights.location -= 0.05;
    } else if (params.crowdPreference === 'hidden') {
      weights.interest -= 0.05;
      weights.location += 0.05;
    }

    return weights;
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

    // Duration fit (0-0.4)
    const maxDuration = this.getMaxDurationForEnergy(params.energyLevel);
    const durationRatio = attraction.duration / maxDuration;
    score += Math.max(0, 0.4 * (1 - Math.abs(1 - durationRatio)));

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
      budget: 1.5, // average of free and inexpensive
      moderate: 3,
      luxury: 4.5, // average of expensive and very expensive
    };

    const priceDiff = Math.abs(priceMap[attraction.priceLevel] - budgetValues[params.budget]);
    score += Math.max(0, 0.4 - priceDiff * 0.1);

    return score;
  },

  calculateLocationScore(location: Location, context: LocationContext): number {
    let score = 0;

    switch (context.type) {
      case 'city_center': {
        // Calculate distance from city center
        const distance = this.calculateDistance(
          context.reference.latitude,
          context.reference.longitude,
          location.latitude,
          location.longitude
        );

        // Score based on zones (0-2km: 1.0, 2-5km: 0.7, 5km+: 0.4)
        if (distance <= 2000) score = 1.0;
        else if (distance <= 5000) score = 0.7;
        else score = 0.4;
        break;
      }

      case 'current_location': {
        const distance = this.calculateDistance(
          context.reference.latitude,
          context.reference.longitude,
          location.latitude,
          location.longitude
        );

        // Higher weight for nearby locations during active phase
        score = Math.max(0, 1 - distance / 5000);
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
          return Math.max(0, 1 - distanceToCluster / cluster.radius);
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
