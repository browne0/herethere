import { protos } from '@googlemaps/places';
import {
  IndoorOutdoor,
  PriceLevel,
  RatingTier,
  ReviewCountTier,
  SeasonalAvailability,
  BusinessStatus,
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
  googleTypes: string[]; // Raw place types from Google
  lastSyncedAt: Date;

  // Viator integration
  viatorProductId: string | null;
  viatorData: any | null; // Store full Viator product data
  lastViatorSync: Date | null;

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
