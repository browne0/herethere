import {
  IndoorOutdoor,
  PriceLevel,
  RatingTier,
  ReviewCountTier,
  SeasonalAvailability,
} from '@prisma/client';

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
  placeId: string;
  neighborhood: string;
}

export interface ImageData {
  urls: Array<{
    url: string;
    cdnUrl: string;
  }>;
}

export interface OpeningHours {
  periods: Array<{
    open: { day: number; time: string };
    close: { day: number; time: string };
  }>;
}

export interface ActivityRecommendation {
  id: string;
  name: string;
  description: string;
  cityId: string;

  // Core quality metrics
  rating: number;
  ratingTier: RatingTier;
  reviewCount: number;
  reviewCountTier: ReviewCountTier;

  // Basic attributes
  isMustSee: boolean;
  isTouristAttraction: boolean;
  placeTypes: string[];

  // Characteristics
  indoorOutdoor: IndoorOutdoor;
  duration: number;
  priceLevel: PriceLevel;
  seasonalAvailability: SeasonalAvailability;

  // Location and media
  location: Location;
  images: ImageData;

  // Operating hours
  openingHours: OpeningHours | null;
  availableDays: number[];

  // External IDs
  googlePlaceId: string | null;
  lastSyncedAt: Date;

  // Restaurant-specific fields
  cuisineTypes?: string[];
  dietaryOptions?: string[];
  hasDietaryOptions?: boolean;
  bestTimes?: string[];
  walkingTime?: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface ScoredActivityRecommendation extends ActivityRecommendation {
  score: number;
  matchReasons: string[];
}
