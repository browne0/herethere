import { ActivityRecommendation, PriceLevel, SeasonalAvailability } from '@prisma/client';
import _ from 'lodash';

import { TripBudget } from '@/app/trips/[tripId]/types';
import { PlaceCategory, CategoryMapping, PLACE_INDICATORS } from '@/constants';
import { prisma } from '@/lib/db';
import { TransportMode } from '@/lib/stores/preferences';

import { ScoringParams } from './types';

interface Location {
  latitude: number;
  longitude: number;
  address: string;
  placeId: string;
  neighborhood: string;
}

export const historicSitesRecommendationService = {
  async getRecommendations(cityId: string, params: ScoringParams) {
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

    // Score sites with our historically-focused algorithm
    const scored = sites.map(site => ({
      ...site,
      score: this.calculateScore(site, params),
    }));

    // Return top 8 scored sites
    const recommendations = scored
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    return recommendations;
  },

  calculateScore(site: ActivityRecommendation, params: ScoringParams): number {
    const weights = this.calculateWeights(params);

    const historicSignificanceScore = this.calculateHistoricSignificanceScore(site);
    const popularityScore = this.calculatePopularityScore(site);
    const accessibilityScore = this.calculateAccessibilityScore(site, params);
    const priceScore = this.calculatePriceScore(site, params);
    const locationScore = this.calculateLocationScore(
      site.location as unknown as Location,
      params.currentLocation,
      params.transportPreferences
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
      historicSignificance: 0.35, // Primary focus on historical value
      popularity: 0.3, // Strong consideration of tourist appeal
      accessibility: 0.15, // Ease of visiting
      price: 0.1, // Price considerations
      location: 0.1, // Location/accessibility
    };

    // Boost historical significance for history buffs
    if (params.interests.includes('history')) {
      weights.historicSignificance += 0.1;
      weights.popularity -= 0.05;
      weights.price -= 0.05;
    }

    // Adjust for crowd preferences
    if (params.crowdPreference === 'popular') {
      weights.popularity += 0.05;
      weights.historicSignificance -= 0.05;
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

    let maxDistance = 1000; // Default 1km for walking
    if (transportPreferences.includes('public-transit')) {
      maxDistance = 5000;
    } else if (transportPreferences.includes('driving')) {
      maxDistance = 10000;
    }

    return Math.max(0, 1 - distance / maxDistance);
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
