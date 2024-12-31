import { ActivityRecommendation, PriceLevel, SeasonalAvailability } from '@prisma/client';
import _ from 'lodash';

import { ParsedItineraryActivity, TripBudget } from '@/app/trips/[tripId]/types';
import { PlaceCategory, CategoryMapping, PLACE_INDICATORS } from '@/constants';
import { prisma } from '@/lib/db';

import { DEFAULT_PAGE_SIZE, LocationContext, PaginationParams, ScoringParams } from './types';

interface Location {
  latitude: number;
  longitude: number;
  address: string;
  placeId: string;
  neighborhood: string;
}

export const historicSitesRecommendationService = {
  async getRecommendations(params: ScoringParams, pagination: PaginationParams) {
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE } = pagination;
    const { cityId } = params;

    const locationContext = params.locationContext;

    // Calculate activity clusters if we have selected activities and are in planning phase
    if (params.phase === 'planning' && params.selectedActivities?.length > 0) {
      locationContext.clusters = this.calculateActivityClusters(params.selectedActivities);
    }

    // Get both historic and tourist attraction sites
    const sites = await prisma.activityRecommendation.findMany({
      where: {
        cityId,
        businessStatus: 'OPERATIONAL',
        OR: [
          {
            placeTypes: {
              hasSome: CategoryMapping[PlaceCategory.HISTORIC].includedTypes,
            },
          },
          {
            AND: [
              { isMustSee: true },
              {
                placeTypes: {
                  hasSome: CategoryMapping[PlaceCategory.ATTRACTION].includedTypes,
                },
              },
            ],
          },
        ],
        seasonalAvailability: SeasonalAvailability.ALL_YEAR,
      },
    });

    // Score and sort sites
    const scoredAndSorted = sites
      .map(site => ({
        ...site,
        score: this.calculateScore(site, params),
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

    // Historic sites often cluster in historic districts
    // Use a slightly smaller minimum radius to favor tighter clusters
    const radius = Math.max(
      1500, // 1.5km minimum radius for historic districts
      mean + standardDeviation
    );

    return [{ center, radius }];
  },

  calculateScore(site: ActivityRecommendation, params: ScoringParams): number {
    const weights = this.calculateWeights(params);

    const historicSignificanceScore = this.calculateHistoricSignificanceScore(site);
    const popularityScore = this.calculatePopularityScore(site);
    const accessibilityScore = this.calculateAccessibilityScore(site, params);
    const priceScore = this.calculatePriceScore(site, params);
    const locationScore = this.calculateLocationScore(
      site.location as unknown as Location,
      params.locationContext
    );

    return (
      historicSignificanceScore * weights.historicSignificance +
      popularityScore * weights.popularity +
      accessibilityScore * weights.accessibility +
      priceScore * weights.price +
      locationScore * weights.location
    );
  },

  calculateWeights(params: ScoringParams) {
    const weights = {
      historicSignificance: 0.35,
      popularity: 0.25, // Reduced from 0.3
      accessibility: 0.15,
      price: 0.1,
      location: 0.15, // Increased from 0.1
    };

    // Adjust weights based on phase
    if (params.phase === 'active') {
      weights.location += 0.05;
      weights.popularity -= 0.05;
    }

    // Boost historical significance for history buffs
    if (params.interests.includes('history')) {
      weights.historicSignificance += 0.1;
      weights.popularity -= 0.05;
      weights.price -= 0.05;
    }

    // Adjust for crowd preferences
    if (params.crowdPreference === 'popular') {
      weights.popularity += 0.05;
      weights.location -= 0.05;
    } else if (params.crowdPreference === 'hidden') {
      weights.popularity -= 0.05;
      weights.historicSignificance += 0.05;
    }

    return weights;
  },

  calculateHistoricSignificanceScore(site: ActivityRecommendation): number {
    let score = 0;
    const historicIndicators = PLACE_INDICATORS.HISTORICAL;

    // Check description for historical indicators
    if (site.description) {
      const description = site.description.toLowerCase();

      // Time period mentions (most important)
      const timePeriodMatches = Array.from(historicIndicators.TIME_PERIODS).filter(indicator =>
        description.includes(indicator.toLowerCase())
      ).length;
      score += Math.min(0.4, timePeriodMatches * 0.1);

      // Architectural significance
      const architecturalMatches = Array.from(historicIndicators.ARCHITECTURAL).filter(indicator =>
        description.includes(indicator.toLowerCase())
      ).length;
      score += Math.min(0.3, architecturalMatches * 0.1);

      // Cultural significance
      const culturalMatches = Array.from(historicIndicators.CULTURAL).filter(indicator =>
        description.includes(indicator.toLowerCase())
      ).length;
      score += Math.min(0.3, culturalMatches * 0.1);
    }

    // Bonus for historic place types
    if (
      site.placeTypes.some(type =>
        CategoryMapping[PlaceCategory.HISTORIC].includedTypes.includes(type)
      )
    ) {
      score += 0.2;
    }

    // Must-see historic bonus
    if (site.isMustSee) {
      score += 0.2;
    }

    return Math.min(1, score);
  },

  calculatePopularityScore(site: ActivityRecommendation): number {
    let score = 0;

    // Base tourist appeal
    if (site.isTouristAttraction) {
      score += 0.3;
    }

    // Rating quality
    if (site.ratingTier === 'EXCEPTIONAL') {
      score += 0.4;
    } else if (site.ratingTier === 'HIGH') {
      score += 0.3;
    } else if (site.ratingTier === 'AVERAGE') {
      score += 0.1;
    }

    // Review volume
    if (site.reviewCountTier === 'VERY_HIGH') {
      score += 0.3;
    } else if (site.reviewCountTier === 'HIGH') {
      score += 0.2;
    } else if (site.reviewCountTier === 'MODERATE') {
      score += 0.1;
    }

    return Math.min(1, score);
  },

  calculateAccessibilityScore(site: ActivityRecommendation, params: ScoringParams): number {
    let score = 0.5;

    // Physical accessibility based on historic features
    const isComplexSite = site.placeTypes.some(
      type =>
        ['archaeological_site', 'castle'].includes(type) ||
        (site.description &&
          Array.from(PLACE_INDICATORS.HISTORICAL.ARCHITECTURAL).some(term =>
            site.description.toLowerCase().includes(term.toLowerCase())
          ))
    );

    // Adjust score based on energy level and site complexity
    if (isComplexSite) {
      score += params.energyLevel === 3 ? 0.3 : params.energyLevel === 2 ? 0.1 : -0.1;
    } else {
      score += params.energyLevel === 1 ? 0.2 : 0.1;
    }

    // Location accessibility bonus
    const location = site.location as unknown as Location;
    if (location && location.neighborhood) {
      score += 0.1;
    }

    return Math.min(1, Math.max(0, score));
  },

  calculatePriceScore(site: ActivityRecommendation, params: ScoringParams): number {
    if (site.priceLevel === 'PRICE_LEVEL_FREE') {
      return params.budget === 'budget' ? 1 : 0.8;
    }

    const budgetMap: Record<TripBudget, PriceLevel[]> = {
      budget: ['PRICE_LEVEL_FREE', 'PRICE_LEVEL_INEXPENSIVE'],
      moderate: ['PRICE_LEVEL_MODERATE'],
      luxury: ['PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE'],
    };

    // Direct budget match
    let score = budgetMap[params.budget].includes(site.priceLevel) ? 0.6 : 0;

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

    const priceDiff = Math.abs(priceMap[site.priceLevel] - budgetValues[params.budget]);
    score += Math.max(0, 0.4 - priceDiff * 0.1);

    return score;
  },

  calculateLocationScore(location: Location, context: LocationContext): number {
    let score = 0;

    switch (context.type) {
      case 'city_center': {
        // Historic sites often cluster in old town/city centers
        const distance = this.calculateDistance(
          context.reference.latitude,
          context.reference.longitude,
          location.latitude,
          location.longitude
        );

        // Higher scores for very close proximity to center
        if (distance <= 1000)
          score = 1.0; // Premium for core historic district
        else if (distance <= 2500)
          score = 0.85; // Strong score for inner city
        else if (distance <= 4000)
          score = 0.6; // Moderate score for wider area
        else score = 0.3; // Base score for outlying areas
        break;
      }

      case 'current_location': {
        const distance = this.calculateDistance(
          context.reference.latitude,
          context.reference.longitude,
          location.latitude,
          location.longitude
        );

        // Historic sites are destinations worth traveling to
        // Use a gradual decay over a longer distance
        score = Math.max(0, 1 - Math.pow(distance / 10000, 2)); // Quadratic decay over 10km
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

          // Historic sites often form natural clusters
          // Use a steeper scoring curve within clusters
          if (distanceToCluster <= cluster.radius * 0.5) {
            return 1.0; // Premium for very close sites
          } else if (distanceToCluster <= cluster.radius) {
            return 0.8; // Strong score within radius
          } else {
            return Math.max(0, 1 - distanceToCluster / (cluster.radius * 1.5)); // Gradual decay outside
          }
        });

        // Take the highest cluster score
        score = Math.max(...clusterScores);
        break;
      }
    }

    return score;
  },

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
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
