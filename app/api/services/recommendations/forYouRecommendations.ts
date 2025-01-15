import { BusinessStatus, PriceLevel } from '@prisma/client';
import _ from 'lodash';

import { ParsedItineraryActivity, TripBudget } from '@/app/trips/[tripId]/types';
import { CategoryMapping, NON_VEGETARIAN_RESTAURANTS, PlaceCategory } from '@/constants';
import { prisma } from '@/lib/db';
import { DietaryRestriction, InterestType } from '@/lib/stores/preferences';
import { ActivityRecommendation, Location } from '@/lib/types/recommendations';

import { VEGETARIAN_RESTAURANT_TYPES } from './restaurants';
import { DEFAULT_PAGE_SIZE, LocationContext, PaginationParams, ScoringParams } from './types';

export const forYouRecommendationsService = {
  async getRecommendations(params: ScoringParams, pagination: PaginationParams) {
    const { page = 1, pageSize = DEFAULT_PAGE_SIZE } = pagination;
    const { cityId, dietaryRestrictions } = params;
    const relevantTypes = this.getPlaceTypesFromInterests(params.interests);

    const isVegetarian = (dietaryRestrictions as DietaryRestriction[]).includes('vegetarian');

    const locationContext = params.locationContext;

    // Calculate activity clusters if we have selected activities
    if (params.phase === 'planning' && params.selectedActivities?.length > 0) {
      locationContext.clusters = this.calculateActivityClusters(params.selectedActivities);
    }

    const activityQuery = {
      cityId,
      businessStatus: BusinessStatus.OPERATIONAL,
      NOT: {
        placeTypes: {
          hasSome: [...CategoryMapping[PlaceCategory.RESTAURANT].includedTypes, 'event_venue'],
        },
      },
      OR: [
        {
          placeTypes: {
            hasSome: relevantTypes,
          },
        },
      ],
    };

    const restaurantQuery = {
      cityId,
      businessStatus: BusinessStatus.OPERATIONAL,
      placeTypes: {
        hasSome: CategoryMapping[PlaceCategory.RESTAURANT].includedTypes,
      },
      ...(isVegetarian && {
        AND: [
          {
            placeTypes: {
              hasSome: VEGETARIAN_RESTAURANT_TYPES,
            },
          },
          {
            NOT: {
              placeTypes: {
                hasSome: NON_VEGETARIAN_RESTAURANTS,
              },
            },
          },
        ],
      }),
    };

    // Get activities that match user's interests and preferences
    const [activitiesWithoutRestaurants, restaurants] = await Promise.all([
      prisma.activityRecommendation.findMany({
        where: activityQuery,
      }) as unknown as ActivityRecommendation[],
      prisma.activityRecommendation.findMany({
        where: restaurantQuery,
      }) as unknown as ActivityRecommendation[],
    ]);

    const activities = [...activitiesWithoutRestaurants, ...restaurants];

    // Score and sort activities based on personalization
    const scoredAndSorted = activities
      .map(activity => ({
        ...activity,
        score: this.calculatePersonalizedScore(activity, params),
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

    const locations = activities.map(a => ({
      latitude: a.recommendation.location.latitude,
      longitude: a.recommendation.location.longitude,
    }));

    // Create a single cluster centered on the mean location
    const center = {
      latitude: _.meanBy(locations, 'latitude'),
      longitude: _.meanBy(locations, 'longitude'),
    };

    const distances = locations.map(loc =>
      this.calculateDistance(center.latitude, center.longitude, loc.latitude, loc.longitude)
    );

    const radius = Math.max(
      2000, // Minimum 2km radius
      _.mean(distances) + Math.sqrt(_.mean(distances.map(d => (d - _.mean(distances)) ** 2)))
    );

    return [{ center, radius }];
  },

  calculatePersonalizedScore(activity: ActivityRecommendation, params: ScoringParams): number {
    const weights = this.calculatePersonalizedWeights(params);

    const interestScore = this.calculateInterestScore(activity, params);
    const timeScore = this.calculateTimeScore(activity, params);
    const priceScore = this.calculatePriceScore(activity, params);
    const locationScore = this.calculateLocationScore(
      activity.location as unknown as Location,
      params.locationContext
    );
    const activityFitScore = this.calculateActivityFitScore(activity, params);

    return (
      interestScore * weights.interest +
      timeScore * weights.time +
      priceScore * weights.price +
      locationScore * weights.location +
      activityFitScore * weights.activityFit
    );
  },

  calculatePersonalizedWeights(params: ScoringParams) {
    const weights = {
      interest: 0.5,
      time: 0.1,
      price: 0.15,
      location: 0.15,
      activityFit: 0.1,
    };

    // Adjust weights based on user preferences
    if (params.energyLevel) {
      weights.activityFit += 0.05;
      weights.location -= 0.05;
    }

    if (params.preferredStartTime) {
      weights.time += 0.05;
      weights.interest -= 0.05;
    }

    if (params.budget === 'budget') {
      weights.price += 0.1;
      weights.interest -= 0.1;
    }

    return weights;
  },

  calculateInterestScore(activity: ActivityRecommendation, params: ScoringParams): number {
    const relevantTypes = this.getPlaceTypesFromInterests(params.interests);
    const matchingTypes = activity.placeTypes.filter(type => relevantTypes.includes(type));

    // Base score from interest matches
    let score = matchingTypes.length / Math.max(relevantTypes.length, 1);

    // Boost score for highly-rated activities within matching interests
    if (matchingTypes.length > 0) {
      if (activity.ratingTier === 'EXCEPTIONAL') score = Math.min(1, score + 0.3);
      else if (activity.ratingTier === 'HIGH') score = Math.min(1, score + 0.2);
    }

    // Adjust based on crowd preference
    if (params.crowdPreference === 'popular' && activity.reviewCountTier === 'VERY_HIGH') {
      score = Math.min(1, score + 0.2);
    } else if (params.crowdPreference === 'hidden' && activity.reviewCountTier === 'LOW') {
      score = Math.min(1, score + 0.2);
    }

    return score;
  },

  calculateTimeScore(activity: ActivityRecommendation, params: ScoringParams): number {
    if (!params.preferredStartTime || !activity.openingHours) return 0.5;

    const { openingHours } = activity;

    // Use openNow if we're in active phase
    if (params.phase === 'active' && openingHours.openNow !== null) {
      return openingHours.openNow ? 1 : 0;
    }

    if (!openingHours?.periods?.length) return 0.5;

    // Calculate average opening and closing times
    const validPeriods = openingHours.periods.filter(
      period => period?.open?.hour != null && period?.close?.hour != null
    );

    if (validPeriods.length === 0) return 0.5;

    const avgTimes = validPeriods.reduce(
      (acc, period) => {
        if (period.open?.hour != null && period.close?.hour != null) {
          acc.openCount++;
          acc.closeCount++;
          acc.totalOpenHour += period.open.hour;
          acc.totalCloseHour += period.close.hour;
        }
        return acc;
      },
      { openCount: 0, closeCount: 0, totalOpenHour: 0, totalCloseHour: 0 }
    );

    if (avgTimes.openCount === 0) return 0.5;

    // Get opening hour for each day, focusing on regular patterns
    const openHours = validPeriods.map(period => period.open?.hour ?? 0);
    const earliestOpening = Math.min(...openHours);

    let score = 0.5;

    // Score based on preferred start time
    switch (params.preferredStartTime) {
      case 'early': {
        // Early birds (7am-8am start)
        if (earliestOpening <= 7)
          score = 1; // Perfect for early start
        else if (earliestOpening <= 8)
          score = 0.9; // Still great
        else if (earliestOpening <= 9)
          score = 0.7; // Workable but not ideal
        else if (earliestOpening <= 10)
          score = 0.5; // Less optimal
        else score = 0.3; // Not great for early starts
        break;
      }

      case 'mid': {
        // Normal start time (9am)
        if (earliestOpening <= 9)
          score = 1; // Perfect for 9am start
        else if (earliestOpening <= 10)
          score = 0.8; // Slightly delayed start
        else if (earliestOpening <= 11)
          score = 0.6; // Pushing it
        else score = 0.4; // Too late for 9am starter

        // Penalty for too early
        if (earliestOpening <= 7) score *= 0.9; // Unnecessarily early for 9am starter
        break;
      }

      case 'late': {
        // Late starters (10am-11am)
        if (earliestOpening <= 10)
          score = 1; // Perfect for late start
        else if (earliestOpening <= 11)
          score = 0.9; // Still great
        else if (earliestOpening <= 12)
          score = 0.7; // Workable
        else score = 0.4; // Too late even for late starter

        // Penalty for too early
        if (earliestOpening <= 8) score *= 0.9; // Unnecessarily early for late starter
        break;
      }
    }

    // Additional considerations

    // Bonus for places open for longer duration (more flexible)
    const hasLongHours = validPeriods.some(period => {
      const openHour = period.open?.hour ?? 0;
      const closeHour = period.close?.hour ?? 0;
      const duration = closeHour >= openHour ? closeHour - openHour : 24 - openHour + closeHour;
      return duration >= 8; // At least 8 hours of operation
    });
    if (hasLongHours) score = Math.min(1, score + 0.1);

    // Active phase considerations
    if (params.phase === 'active') {
      // Penalty for places closing soon
      if (openingHours.nextCloseTime) {
        const closeTimestamp = (openingHours.nextCloseTime.seconds as number) * 1000;
        const now = Date.now();
        const hoursUntilClose = (closeTimestamp - now) / (1000 * 60 * 60);

        if (hoursUntilClose < 1)
          score *= 0.5; // Closing within the hour
        else if (hoursUntilClose < 2) score *= 0.8; // Closing within 2 hours
      }
    }

    return score;
  },

  calculatePriceScore(activity: ActivityRecommendation, params: ScoringParams): number {
    if (activity.priceLevel === 'PRICE_LEVEL_FREE') {
      return params.budget === 'budget' ? 1 : 0.8;
    }

    const budgetMap: Record<TripBudget, PriceLevel[]> = {
      budget: ['PRICE_LEVEL_FREE', 'PRICE_LEVEL_INEXPENSIVE'],
      moderate: ['PRICE_LEVEL_MODERATE'],
      luxury: ['PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE'],
    };

    // Direct budget match
    let score = budgetMap[params.budget].includes(activity.priceLevel) ? 0.8 : 0.3;

    // Adjust for rating within budget range
    if (score > 0.5 && activity.ratingTier === 'EXCEPTIONAL') {
      score = Math.min(1, score + 0.2);
    }

    return score;
  },

  calculateLocationScore(location: Location, context: LocationContext): number {
    let score = 0;

    switch (context.type) {
      case 'city_center': {
        const distance = this.calculateDistance(
          context.reference.latitude,
          context.reference.longitude,
          location.latitude,
          location.longitude
        );

        score = distance <= 2000 ? 1.0 : distance <= 5000 ? 0.7 : 0.4;
        break;
      }

      case 'current_location': {
        const distance = this.calculateDistance(
          context.reference.latitude,
          context.reference.longitude,
          location.latitude,
          location.longitude
        );

        score = Math.max(0, 1 - distance / 5000);
        break;
      }

      case 'activity_cluster': {
        if (!context.clusters?.length) {
          score = 0.5;
          break;
        }

        const clusterScores = context.clusters.map(cluster => {
          const distanceToCluster = this.calculateDistance(
            cluster.center.latitude,
            cluster.center.longitude,
            location.latitude,
            location.longitude
          );
          return Math.max(0, 1 - distanceToCluster / cluster.radius);
        });

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

    return R * c;
  },

  calculateActivityFitScore(activity: ActivityRecommendation, params: ScoringParams): number {
    let score = 0;

    // Activity intensity alignment (0-0.4)
    const activityIntensity = this.getActivityIntensityScore(activity.placeTypes);
    switch (params.energyLevel) {
      case 1: // Light & Easy
        score += 0.4 * (1 - activityIntensity);
        break;
      case 2: // Moderate
        score += 0.4 * (1 - Math.abs(0.5 - activityIntensity));
        break;
      case 3: // Very Active
        score += 0.4 * activityIntensity;
        break;
    }

    // Transport mode compatibility (0-0.3)
    if (params.transportPreferences.includes('walking')) {
      const walkingDistance = this.calculateDistance(
        params.locationContext.reference.latitude,
        params.locationContext.reference.longitude,
        activity.location.latitude,
        activity.location.longitude
      );
      if (walkingDistance <= 2000) score += 0.3;
      else if (walkingDistance <= 4000) score += 0.2;
    } else {
      score += 0.2; // Neutral score for other transport modes
    }

    // Quality and popularity alignment (0-0.3)
    const popularityScore =
      activity.reviewCountTier === 'VERY_HIGH'
        ? 1
        : activity.reviewCountTier === 'HIGH'
          ? 0.7
          : activity.reviewCountTier === 'MODERATE'
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

  getActivityIntensityScore(placeTypes: string[]): number {
    const highIntensityTypes = new Set([
      'hiking_area',
      'amusement_park',
      'zoo',
      'aquarium',
      'beach',
      'national_park',
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

    const highCount = placeTypes.filter(type => highIntensityTypes.has(type)).length;
    const moderateCount = placeTypes.filter(type => moderateIntensityTypes.has(type)).length;
    const lowCount = placeTypes.filter(type => lowIntensityTypes.has(type)).length;

    const total = highCount + moderateCount + lowCount || 1;
    return (highCount * 1 + moderateCount * 0.6 + lowCount * 0.3) / total;
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
          CategoryMapping[PlaceCategory.NIGHTLIFE].includedTypes.forEach(type =>
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
        case 'food':
          CategoryMapping[PlaceCategory.RESTAURANT].includedTypes.forEach(type =>
            placeTypes.add(type)
          );
          break;
      }
    });

    return Array.from(placeTypes);
  },

  getDietaryRestrictionFilters(dietaryRestrictions: string[]) {
    const filters = [];

    if (dietaryRestrictions.includes('vegetarian')) {
      filters.push({
        features: {
          path: ['servesVegetarianFood'],
          equals: true,
        },
      });
    }

    if (dietaryRestrictions.includes('vegan')) {
      filters.push({
        features: {
          path: ['servesVeganFood'],
          equals: true,
        },
      });
    }

    return filters;
  },

  calculateRestaurantScore(restaurant: ActivityRecommendation, params: ScoringParams): number {
    const weights = {
      cuisine: 0.3,
      price: 0.2,
      rating: 0.2,
      location: 0.2,
      //   timing: 0.1,
    };

    // Calculate cuisine match score
    const cuisineScore = params.cuisinePreferences.preferred.some(cuisine =>
      restaurant.placeTypes.includes(cuisine)
    )
      ? 1
      : 0.5;

    // Calculate price score similar to activity price score
    const priceScore = this.calculatePriceScore(restaurant, params);

    // Calculate rating score
    const ratingScore =
      restaurant.ratingTier === 'EXCEPTIONAL'
        ? 1
        : restaurant.ratingTier === 'HIGH'
          ? 0.8
          : restaurant.ratingTier === 'AVERAGE'
            ? 0.6
            : 0.4;

    // Calculate location score
    const locationScore = this.calculateLocationScore(
      restaurant.location as unknown as Location,
      params.locationContext
    );

    // Calculate timing score based on meal importance
    // const timingScore = this.calculateRestaurantTimingScore(restaurant, params);

    return (
      cuisineScore * weights.cuisine +
      priceScore * weights.price +
      ratingScore * weights.rating +
      locationScore * weights.location
      //   timingScore * weights.timing
    );
  },

  // TODO: Implement this
  //   calculateRestaurantTimingScore(
  //     restaurant: ActivityRecommendation,
  //     params: ScoringParams
  //   ): number {
  //     const { mealImportance } = params;
  //     const features = restaurant.features;

  //     if (!features) return 0.5;

  //     let score = 0.5;

  //     // Score based on meal service availability and importance
  //     if (mealImportance.breakfast && features.servesBreakfast) score += 0.2;
  //     if (mealImportance.lunch && features.servesLunch) score += 0.2;
  //     if (mealImportance.dinner && features.servesDinner) score += 0.2;

  //     // Normalize score to 0-1 range
  //     return Math.min(1, score);
  //   },
};
