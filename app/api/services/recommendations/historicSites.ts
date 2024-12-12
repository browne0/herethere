import { ActivityRecommendation, PriceLevel } from '@prisma/client';
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
    // 1. Get initial set of historic sites
    const historicSites = await prisma.activityRecommendation.findMany({
      where: {
        cityId,
        businessStatus: 'OPERATIONAL',
        OR: [
          {
            placeTypes: {
              hasSome: CategoryMapping[PlaceCategory.HISTORIC].includedTypes,
            },
          },
          // Also include museums which might be historically significant
          {
            placeTypes: {
              hasSome: CategoryMapping[PlaceCategory.MUSEUM].includedTypes,
            },
            isMustSee: true,
          },
        ],
        // seasonalAvailability: SeasonalAvailability.ALL_YEAR,
      },
      take: 50,
    });

    // 2. Score historic sites
    const scored = historicSites.map(site => ({
      ...site,
      score: this.calculateScore(site, params),
    }));

    // 3. Sort by score and filter out low scores
    const recommendations = scored
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    return recommendations;
  },

  calculateScore(site: ActivityRecommendation, params: ScoringParams): number {
    const weights = this.calculateWeights(params);

    const historicSignificanceScore = this.calculateHistoricSignificanceScore(site);
    const culturalRelevanceScore = this.calculateCulturalRelevanceScore(site);
    const accessibilityScore = this.calculateAccessibilityScore(site, params);
    const priceScore = this.calculatePriceScore(site, params);
    const locationScore = this.calculateLocationScore(
      site.location as unknown as Location,
      params.currentLocation,
      params.transportPreferences
    );

    return (
      historicSignificanceScore * weights.historicSignificance +
      culturalRelevanceScore * weights.culturalRelevance +
      accessibilityScore * weights.accessibility +
      priceScore * weights.price +
      locationScore * weights.location
    );
  },

  calculateWeights(params: ScoringParams) {
    const weights = {
      historicSignificance: 0.35, // Primary weight for historic value
      culturalRelevance: 0.25, // Cultural importance
      accessibility: 0.2, // How easy it is to visit and appreciate
      price: 0.1, // Price considerations
      location: 0.1, // Location/accessibility
    };

    // Increase historic significance for history buffs
    if (params.interests.includes('history')) {
      weights.historicSignificance += 0.05;
      weights.price -= 0.05;
    }

    // Adjust for photography interest
    if (params.interests.includes('photography')) {
      weights.culturalRelevance += 0.05;
      weights.location -= 0.05;
    }

    // Adjust for budget sensitivity
    if (params.budget === 'budget') {
      weights.price += 0.05;
      weights.culturalRelevance -= 0.05;
    }

    return weights;
  },

  calculateHistoricSignificanceScore(site: ActivityRecommendation): number {
    let score = 0;

    // Core historic significance factors from predefined indicators
    const historicIndicators = PLACE_INDICATORS.HISTORICAL;
    const historicTypes = new Set(CategoryMapping[PlaceCategory.HISTORIC].includedTypes);

    // Religious types are included in CategoryMapping
    const religiousTypes = new Set(['church', 'hindu_temple', 'mosque', 'synagogue']);

    // Score based on place types
    site.placeTypes.forEach(type => {
      if (historicTypes.has(type)) score += 0.3;
      if (religiousTypes.has(type)) score += 0.2;
    });

    // Check description for historical indicators
    if (site.description) {
      const description = site.description.toLowerCase();

      // Check for time period indicators
      historicIndicators.TIME_PERIODS.forEach(indicator => {
        if (description.includes(indicator.toLowerCase())) {
          score += 0.1;
        }
      });

      // Check for architectural significance
      historicIndicators.ARCHITECTURAL.forEach(indicator => {
        if (description.includes(indicator.toLowerCase())) {
          score += 0.1;
        }
      });

      // Check for cultural significance
      historicIndicators.CULTURAL.forEach(indicator => {
        if (description.includes(indicator.toLowerCase())) {
          score += 0.1;
        }
      });
    }

    // Bonus for must-see historic sites
    if (site.isMustSee) {
      score += 0.2;
    }

    // Bonus for high ratings and reviews
    if (site.ratingTier === 'EXCEPTIONAL' && site.reviewCountTier === 'VERY_HIGH') {
      score += 0.2;
    }

    return Math.min(1, score);
  },

  calculateCulturalRelevanceScore(site: ActivityRecommendation): number {
    let score = 0;

    // Cultural significance from place indicators
    if (site.description) {
      const description = site.description.toLowerCase();
      PLACE_INDICATORS.HISTORICAL.CULTURAL.forEach(indicator => {
        if (description.includes(indicator.toLowerCase())) {
          score += 0.2;
        }
      });
    }

    // Tourist attraction bonus
    if (site.isTouristAttraction) {
      score += 0.3;
    }

    // Higher score for well-preserved and significant sites
    if (site.ratingTier === 'EXCEPTIONAL') {
      score += 0.3;
    } else if (site.ratingTier === 'HIGH') {
      score += 0.2;
    }

    // Bonus for high visitor engagement
    if (site.reviewCountTier === 'VERY_HIGH') {
      score += 0.2;
    } else if (site.reviewCountTier === 'HIGH') {
      score += 0.1;
    }

    return Math.min(1, score);
  },

  calculateAccessibilityScore(site: ActivityRecommendation, params: ScoringParams): number {
    let score = 0.5; // Start with neutral score

    // Determine intensity based on historical architectural features
    const isHighIntensity = site.placeTypes.some(
      type =>
        ['archaeological_site', 'castle'].includes(type) ||
        // Check if description contains architectural terms that suggest high intensity
        (site.description &&
          Array.from(PLACE_INDICATORS.HISTORICAL.ARCHITECTURAL).some(term =>
            site.description.toLowerCase().includes(term.toLowerCase())
          ))
    );

    if (isHighIntensity) {
      score += params.energyLevel === 3 ? 0.3 : params.energyLevel === 2 ? 0.1 : -0.1;
    } else {
      score += params.energyLevel === 1 ? 0.2 : 0.1;
    }

    // Consider crowd preferences
    if (params.crowdPreference === 'hidden' && site.reviewCountTier !== 'VERY_HIGH') {
      score += 0.2;
    } else if (params.crowdPreference === 'popular' && site.reviewCountTier === 'VERY_HIGH') {
      score += 0.2;
    }

    // Location accessibility
    const location = site.location as unknown as Location;
    if (location && location.neighborhood) {
      // Favor locations in well-known areas
      score += 0.1;
    }

    return Math.min(1, Math.max(0, score));
  },

  calculatePriceScore(site: ActivityRecommendation, params: ScoringParams): number {
    // For free historic sites, give high score
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
