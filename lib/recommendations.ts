// types/recommendations.ts
import {
  PriceLevel,
  RatingTier,
  ReviewCountTier,
  IndoorOutdoor,
  SeasonalAvailability,
  ActivityRecommendation,
} from '@prisma/client';

interface UserPreferences {
  interests: string[]; // Matches with placeTypes
  pricePreference: PriceLevel[]; // Acceptable price levels
  indoorOutdoorPreference?: IndoorOutdoor;
  maxDuration?: number; // in minutes
  mustSeeOnly?: boolean; // If true, only show must-see attractions
  touristPreference?: boolean; // If true, prefer tourist attractions
  seasonality?: SeasonalAvailability;
}

interface TripContext {
  selectedActivities: string[]; // IDs of already selected activities
  tripDates: {
    startDate: Date;
    endDate: Date;
  };
  baseLocation?: {
    // Hotel or primary location
    latitude: number;
    longitude: number;
  };
}

// lib/recommendations.ts
export class RecommendationEngine {
  private readonly RATING_WEIGHTS = {
    [RatingTier.EXCEPTIONAL]: 1.0,
    [RatingTier.HIGH]: 0.8,
    [RatingTier.AVERAGE]: 0.6,
    [RatingTier.LOW]: 0.3,
  };

  private readonly REVIEW_COUNT_WEIGHTS = {
    [ReviewCountTier.VERY_HIGH]: 1.0,
    [ReviewCountTier.HIGH]: 0.8,
    [ReviewCountTier.MODERATE]: 0.6,
    [ReviewCountTier.LOW]: 0.4,
  };

  private calculateQualityScore(activity: ActivityRecommendation): number {
    const ratingWeight = this.RATING_WEIGHTS[activity.ratingTier];
    const reviewWeight = this.REVIEW_COUNT_WEIGHTS[activity.reviewCountTier];

    // Combine rating quality and quantity
    const qualityScore = ratingWeight * 0.6 + reviewWeight * 0.4;

    // Bonus for must-see attractions
    const mustSeeBonus = activity.isMustSee ? 0.2 : 0;

    return Math.min(1, qualityScore + mustSeeBonus);
  }

  private calculateRelevanceScore(
    activity: ActivityRecommendation,
    preferences: UserPreferences
  ): number {
    let score = 0;
    let factors = 0;

    // Price preference match
    if (preferences.pricePreference.includes(activity.priceLevel)) {
      score += 1;
    }
    factors += 1;

    // Indoor/outdoor preference match
    if (preferences.indoorOutdoorPreference) {
      if (
        activity.indoorOutdoor === preferences.indoorOutdoorPreference ||
        activity.indoorOutdoor === IndoorOutdoor.BOTH
      ) {
        score += 1;
      }
      factors += 1;
    }

    // Duration preference match
    if (preferences.maxDuration) {
      if (activity.duration <= preferences.maxDuration) {
        score += 1;
      }
      factors += 1;
    }

    // Interest match (placeTypes)
    const interestMatch = activity.placeTypes.filter(type =>
      preferences.interests.includes(type)
    ).length;
    if (interestMatch > 0) {
      score += interestMatch / Math.max(activity.placeTypes.length, preferences.interests.length);
      factors += 1;
    }

    return factors > 0 ? score / factors : 0.5;
  }

  private calculateSeasonalityScore(
    activity: ActivityRecommendation,
    tripContext: TripContext
  ): number {
    if (activity.seasonalAvailability === SeasonalAvailability.ALL_YEAR) {
      return 1;
    }

    // TODO: Implement seasonal matching logic based on tripContext dates
    return 0.5;
  }

  private calculateLocationScore(
    activity: ActivityRecommendation,
    tripContext: TripContext
  ): number {
    if (!tripContext.baseLocation) return 1;

    const activityLocation = JSON.parse(activity.location as string);

    // Calculate distance from base location
    const distance = this.calculateDistance(
      tripContext.baseLocation.latitude,
      tripContext.baseLocation.longitude,
      activityLocation.latitude,
      activityLocation.longitude
    );

    // Normalize distance score (closer is better)
    return Math.max(0, 1 - distance / 10000); // 10km as max ideal distance
  }

  private calculateBookabilityScore(activity: ActivityRecommendation): number {
    if (!activity.viatorProductId || !activity.viatorData) return 0.5;

    const viatorData = JSON.parse(activity.viatorData as string);
    if (!viatorData.available) return 0.3;

    // Bonus for available Viator experiences
    return 1;
  }

  private calculateDiversityScore(
    activity: ActivityRecommendation,
    selectedActivities: ActivityRecommendation[]
  ): number {
    if (selectedActivities.length === 0) return 1;

    // Check for type diversity
    const selectedTypes = new Set(selectedActivities.flatMap(a => a.placeTypes));
    const newTypes = activity.placeTypes.filter(t => !selectedTypes.has(t));

    return newTypes.length / activity.placeTypes.length;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // Haversine formula implementation
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
  }

  async getRecommendations(
    cityId: string,
    preferences: UserPreferences,
    tripContext: TripContext,
    limit: number = 10
  ): Promise<ActivityRecommendation[]> {
    // Base query with initial filters
    const baseQuery = {
      where: {
        cityId,
        ...(preferences.mustSeeOnly ? { isMustSee: true } : {}),
        ...(preferences.pricePreference
          ? {
              priceLevel: { in: preferences.pricePreference },
            }
          : {}),
        ...(preferences.indoorOutdoorPreference
          ? {
              indoorOutdoor: {
                in: [preferences.indoorOutdoorPreference, IndoorOutdoor.BOTH],
              },
            }
          : {}),
      },
    };

    const activities = await prisma.activityRecommendation.findMany(baseQuery);

    // Get already selected activities for diversity calculation
    const selectedActivities = await prisma.activityRecommendation.findMany({
      where: {
        id: { in: tripContext.selectedActivities },
      },
    });

    // Score each activity
    const scoredActivities = await Promise.all(
      activities.map(async activity => {
        const qualityScore = this.calculateQualityScore(activity);
        const relevanceScore = this.calculateRelevanceScore(activity, preferences);
        const seasonalityScore = this.calculateSeasonalityScore(activity, tripContext);
        const locationScore = this.calculateLocationScore(activity, tripContext);
        const bookabilityScore = this.calculateBookabilityScore(activity);
        const diversityScore = this.calculateDiversityScore(activity, selectedActivities);

        // Weight the scores
        const finalScore =
          qualityScore * 0.25 +
          relevanceScore * 0.25 +
          seasonalityScore * 0.15 +
          locationScore * 0.15 +
          bookabilityScore * 0.1 +
          diversityScore * 0.1;

        return {
          activity,
          score: finalScore,
          factors: {
            qualityScore,
            relevanceScore,
            seasonalityScore,
            locationScore,
            bookabilityScore,
            diversityScore,
          },
        };
      })
    );

    // Sort by score and return top results
    return scoredActivities
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ activity }) => activity);
  }
}
