import { ActivityRecommendation, PriceLevel } from '@prisma/client';
import _ from 'lodash';

import { TripBudget } from '@/app/trips/[tripId]/types';
import { CategoryMapping, PlaceCategory } from '@/constants';
import { prisma } from '@/lib/db';
import { InterestType, TransportMode, CrowdPreference } from '@/lib/stores/preferences';

import { ScoringParams } from './types';

interface Location {
  latitude: number;
  longitude: number;
  address: string;
  placeId: string;
  neighborhood: string;
}

export const nightlifeRecommendationService = {
  async getRecommendations(cityId: string, params: ScoringParams) {
    // 1. Get initial set of nightlife venues
    const venues = await prisma.activityRecommendation.findMany({
      where: {
        cityId,
        businessStatus: 'OPERATIONAL',
        primaryType: {
          in: CategoryMapping[PlaceCategory.NIGHTLIFE].includedTypes,
        },
        NOT: {
          placeTypes: {
            hasSome: ['movie_theater', 'restaurant'], // Exclude restaurants
          },
        },
        reviewCount: {
          gte: 300,
        },
      },
    });

    // 2. Score venues
    const scored = venues.map(venue => ({
      ...venue,
      score: this.calculateScore(venue, params),
    }));

    // 3. Sort by score and filter out low scores
    const recommendations = scored
      .filter(r => r.score > 0.4) // Higher minimum threshold for nightlife
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    return recommendations;
  },

  calculateScore(venue: ActivityRecommendation, params: ScoringParams): number {
    const weights = this.calculateWeights(params);

    const venueTypeScore = this.calculateVenueTypeScore(venue, params.interests);
    const atmosphereScore = this.calculateAtmosphereScore(venue, params);
    const priceScore = this.calculatePriceScore(venue, params);
    const locationScore = this.calculateLocationScore(
      venue.location as unknown as Location,
      params.currentLocation,
      params.transportPreferences
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
      venueType: 0.25, // Match to interests/preferences
      atmosphere: 0.25, // Energy level and vibe
      price: 0.2, // Budget alignment
      location: 0.15, // Accessibility
      popularity: 0.15, // Crowd levels
    };

    // Adjust for crowd preference
    if (params.crowdPreference === 'popular') {
      weights.popularity += 0.05;
      weights.location -= 0.05;
    } else if (params.crowdPreference === 'hidden') {
      weights.popularity -= 0.05;
      weights.atmosphere += 0.05;
    }

    // Adjust for budget sensitivity
    if (params.budget === 'budget') {
      weights.price += 0.05;
      weights.atmosphere -= 0.05;
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

    // Nightlife venues should ideally be closer for safety
    let maxDistance = 800; // Default 800m for walking
    if (transportPreferences.includes('public-transit')) {
      maxDistance = 3000; // 3km for public transit
    } else if (transportPreferences.includes('driving')) {
      maxDistance = 5000; // 5km for driving
    }

    return Math.max(0, 1 - distance / maxDistance);
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
