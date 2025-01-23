import { protos } from '@googlemaps/places';
import {
  BusinessStatus,
  IndoorOutdoor,
  PriceLevel,
  RatingTier,
  ReviewCountTier,
  SeasonalAvailability,
} from '@prisma/client';
import { Random } from 'unsplash-js/dist/methods/photos/types';

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

export type UnsplashImageData = Random;

export interface ParkingFeatures {
  freeParkingLot?: boolean;
  paidParkingLot?: boolean;
  streetParking?: boolean;
  valetParking?: boolean;
}

export interface Features {
  wheelchair?: boolean;
  dineIn?: boolean;
  takeout?: boolean;
  delivery?: boolean;
  parking?: ParkingFeatures;
  reservable?: boolean;
  servesBeer?: boolean;
  servesWine?: boolean;
  outdoorSeating?: boolean;
  servesVegetarianFood?: boolean;
}

export interface TikTokVideo {
  video_id: string;
  like_count: number;
  share_count: number;
  play_count: number;
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
  duration: number; // in minutes
  priceLevel: PriceLevel;
  seasonalAvailability: SeasonalAvailability;

  // Location and media
  location: Location;
  images: ImageData;

  // Operating hours
  openingHours: protos.google.maps.places.v1.Place.IOpeningHours | null;
  availableDays: number[]; // [0,1,2,3,4,5,6] for days of week

  // Business status
  businessStatus: BusinessStatus;
  primaryType: string | null; // Direct from Places API primaryTypeDisplayName

  // Features
  features: Features | null;

  // External IDs and metadata
  googlePlaceId: string | null;
  lastSyncedAt: Date;

  // Viator integration
  viatorProductId: string | null;
  viatorData: any | null; // Store full Viator product data
  lastViatorSync: Date | null;

  // TikTok integration
  tiktokVideos: TikTokVideo[];
  lastTikTokSync: Date | null;

  // Restaurant-specific fields (optional)
  cuisineTypes?: string[];
  dietaryOptions?: string[];
  hasDietaryOptions?: boolean;
  bestTimes?: string[];
  walkingTime?: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
