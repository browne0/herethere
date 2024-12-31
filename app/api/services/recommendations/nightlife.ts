import { ActivityRecommendation, PriceLevel } from '@prisma/client';
import _ from 'lodash';

import { ParsedItineraryActivity, TripBudget } from '@/app/trips/[tripId]/types';
import { CategoryMapping, PlaceCategory } from '@/constants';
import { prisma } from '@/lib/db';
import { InterestType, CrowdPreference } from '@/lib/stores/preferences';

import { DEFAULT_PAGE_SIZE, LocationContext, PaginationParams, ScoringParams } from './types';

interface Location {
  latitude: number;
  longitude: number;
  address: string;
  placeId: string;
  neighborhood: string;
}

export const nightlifeRecommendationService = {
  async getRecommendations(params: ScoringParams, pagination: PaginationParams) {
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE } = pagination;
    const { cityId } = params;

    const locationContext = params.locationContext;

    // Calculate activity clusters if we have selected activities and are in planning phase
    if (params.phase === 'planning' && params.selectedActivities?.length > 0) {
      locationContext.clusters = this.calculateActivityClusters(params.selectedActivities);
    }

    // Get initial set of nightlife venues
    const venues = await prisma.activityRecommendation.findMany({
      where: {
        cityId,
        businessStatus: 'OPERATIONAL',
        primaryType: {
          in: CategoryMapping[PlaceCategory.NIGHTLIFE].includedTypes,
        },
        NOT: {
          placeTypes: {
            hasSome: ['movie_theater', 'restaurant'],
          },
        },
        reviewCount: {
          gte: 300,
        },
      },
    });

    // Score and sort venues
    const scoredAndSorted = venues
      .map(venue => ({
        ...venue,
        score: this.calculateScore(venue, params),
      }))
      .filter(r => r.score > 0.4) // Higher minimum threshold for nightlife
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

    // Focus on evening activities for nightlife clustering
    const eveningActivities = activities.filter(activity => {
      const hour = new Date(activity.startTime).getHours();
      return hour >= 17; // After 5 PM
    });

    if (eveningActivities.length < 2) return [];

    // Get locations from evening activities
    const locations = eveningActivities.map(a => ({
      latitude: a.recommendation.location.latitude,
      longitude: a.recommendation.location.longitude,
    }));

    // Create a single cluster centered on evening activities
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

    // Use smaller radius for nightlife districts
    const radius = Math.max(
      800, // 800m minimum radius for nightlife areas
      mean + standardDeviation * 0.8 // Tighter clustering for nightlife
    );

    return [{ center, radius }];
  },

  calculateScore(venue: ActivityRecommendation, params: ScoringParams): number {
    const weights = this.calculateWeights(params);

    const venueTypeScore = this.calculateVenueTypeScore(venue, params.interests);
    const atmosphereScore = this.calculateAtmosphereScore(venue, params);
    const priceScore = this.calculatePriceScore(venue, params);
    const locationScore = this.calculateLocationScore(
      venue.location as unknown as Location,
      params.locationContext
    );
    const popularityScore = this.calculatePopularityScore(venue, params.crowdPreference);

    return (
      venueTypeScore * weights.venueType +
      atmosphereScore * weights.atmosphere +
      priceScore * weights.price +
      locationScore * weights.location +
      popularityScore * weights.popularity
    );
  },

  calculateWeights(params: ScoringParams) {
    const weights = {
      venueType: 0.25,
      atmosphere: 0.25,
      price: 0.15,
      location: 0.2,
      popularity: 0.15,
    };

    // Increase location importance during active phase
    if (params.phase === 'active') {
      weights.location += 0.05;
      weights.atmosphere -= 0.05;
    }

    // Adjust for crowd preference
    if (params.crowdPreference === 'popular') {
      weights.popularity += 0.05;
      weights.location -= 0.05;
    } else if (params.crowdPreference === 'hidden') {
      weights.popularity -= 0.05;
      weights.atmosphere += 0.05;
    }

    return weights;
  },

  calculateVenueTypeScore(venue: ActivityRecommendation, interests: InterestType[]): number {
    let score = 0;

    // Base score from venue type
    const venueTypes = new Set(venue.placeTypes);

    if (interests.includes('entertainment')) {
      if (venueTypes.has('comedy_club')) score += 0.4;
      if (venueTypes.has('karaoke')) score += 0.3;
      if (venueTypes.has('casino')) score += 0.3;
    }

    if (interests.includes('food')) {
      if (venueTypes.has('wine_bar')) score += 0.4;
      if (venueTypes.has('pub')) score += 0.3;
    }

    if (interests.includes('history')) {
      if (venueTypes.has('pub')) score += 0.3; // Historic pubs often have cultural significance
    }

    // General nightlife venues - always scored as they're core to the category
    if (venueTypes.has('night_club')) score += 0.3;
    if (venueTypes.has('bar')) score += 0.3;

    return Math.min(1, score);
  },

  calculateAtmosphereScore(venue: ActivityRecommendation, params: ScoringParams): number {
    let score = 0;

    // Energy level alignment based on venue types
    const venueTypes = new Set(venue.placeTypes);
    const isHighEnergy = venueTypes.has('night_club') || venueTypes.has('casino');
    const isMediumEnergy = venueTypes.has('karaoke') || venueTypes.has('bar');
    const isLowEnergy = venueTypes.has('wine_bar') || venueTypes.has('pub');

    // If no energy level preference is set, give neutral scores
    if (!params.energyLevel) {
      score += 0.3;
    } else {
      switch (params.energyLevel) {
        case 1: // Low energy
          if (isLowEnergy) score += 0.4;
          if (isMediumEnergy) score += 0.2;
          break;
        case 2: // Medium energy
          if (isMediumEnergy) score += 0.4;
          if (isLowEnergy || isHighEnergy) score += 0.2;
          break;
        case 3: // High energy
          if (isHighEnergy) score += 0.4;
          if (isMediumEnergy) score += 0.2;
          break;
      }

      // Rating quality
      if (venue.ratingTier === 'EXCEPTIONAL') score += 0.3;
      else if (venue.ratingTier === 'HIGH') score += 0.2;
      else if (venue.ratingTier === 'AVERAGE') score += 0.1;
    }
    return Math.min(1, score);
  },

  calculatePriceScore(venue: ActivityRecommendation, params: ScoringParams): number {
    // For free venues (rare in nightlife), give moderate score
    if (venue.priceLevel === 'PRICE_LEVEL_FREE') {
      return 0.6;
    }

    const budgetMap: Record<TripBudget, PriceLevel[]> = {
      budget: ['PRICE_LEVEL_INEXPENSIVE'],
      moderate: ['PRICE_LEVEL_MODERATE'],
      luxury: ['PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE'],
    };

    // Direct budget match
    let score = budgetMap[params.budget].includes(venue.priceLevel) ? 0.6 : 0;

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

    const priceDiff = Math.abs(priceMap[venue.priceLevel] - budgetValues[params.budget]);
    score += Math.max(0, 0.4 - priceDiff * 0.1);

    return score;
  },

  calculateLocationScore(location: Location, context: LocationContext): number {
    let score = 0;

    switch (context.type) {
      case 'city_center': {
        // Nightlife often clusters in entertainment districts near city centers
        const distance = this.calculateDistance(
          context.reference.latitude,
          context.reference.longitude,
          location.latitude,
          location.longitude
        );

        // Stricter distance tiers for nightlife
        if (distance <= 1000)
          score = 1.0; // Premium for core entertainment district
        else if (distance <= 2000)
          score = 0.8; // Strong score for nearby areas
        else if (distance <= 3000)
          score = 0.5; // Moderate score for wider area
        else score = 0.2; // Lower score for distant venues
        break;
      }

      case 'current_location': {
        const distance = this.calculateDistance(
          context.reference.latitude,
          context.reference.longitude,
          location.latitude,
          location.longitude
        );

        // Steeper distance decay for nightlife (safety and convenience)
        if (distance <= 800)
          score = 1.0; // Walking distance
        else if (distance <= 3000) {
          // Public transit distance with steep decay
          score = Math.max(0, 0.8 * (1 - (distance - 800) / 2200));
        } else {
          // Longer distances with very steep decay
          score = Math.max(0, 0.4 * (1 - (distance - 3000) / 2000));
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

          // Tighter clustering for nightlife venues
          if (distanceToCluster <= cluster.radius * 0.3) {
            return 1.0; // Premium for very close venues
          } else if (distanceToCluster <= cluster.radius) {
            return 0.7; // Good score within radius
          } else {
            // Steep decay outside cluster
            return Math.max(0, 0.7 - (distanceToCluster - cluster.radius) / 500);
          }
        });

        // Take the highest cluster score
        score = Math.max(...clusterScores);
        break;
      }
    }

    return score;
  },

  calculatePopularityScore(
    venue: ActivityRecommendation,
    crowdPreference: CrowdPreference
  ): number {
    // If no crowd preference is set, give neutral scores
    if (!crowdPreference) {
      return 0.5;
    }

    let score = 0;

    // Review count tier scoring
    switch (venue.reviewCountTier) {
      case 'VERY_HIGH':
        score = crowdPreference === 'popular' ? 1 : crowdPreference === 'mixed' ? 0.6 : 0.3;
        break;
      case 'HIGH':
        score = crowdPreference === 'popular' ? 0.8 : crowdPreference === 'mixed' ? 0.7 : 0.5;
        break;
      case 'MODERATE':
        score = crowdPreference === 'hidden' ? 0.8 : crowdPreference === 'mixed' ? 0.7 : 0.6;
        break;
      case 'LOW':
        score = crowdPreference === 'hidden' ? 1 : crowdPreference === 'mixed' ? 0.6 : 0.4;
        break;
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
