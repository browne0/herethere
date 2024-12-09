/* eslint-disable @typescript-eslint/no-explicit-any */

import { City } from '@prisma/client';

interface SearchArea {
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  radius: number;
}

export enum PlaceCategory {
  MUSEUM = 'MUSEUM',
  HISTORIC = 'HISTORIC',
  ATTRACTION = 'ATTRACTION',
  PARK = 'PARK',
  NIGHTLIFE = 'NIGHTLIFE',
  BEACH = 'BEACH',
  SHOPPING = 'SHOPPING',
  RESTAURANT = 'RESTAURANT',
}

export type HistoricThresholds = {
  RELIGIOUS: { MIN_RATING: number; MIN_REVIEWS: number };
  STANDARD: { MIN_RATING: number; MIN_REVIEWS: number };
};

export type StandardThresholds = {
  MIN_RATING: number;
  MIN_REVIEWS: number;
  EXCEPTIONAL_RATING: number;
  EXCEPTIONAL_REVIEWS: number;
};

export function isHistoricThresholds(thresholds: any): thresholds is HistoricThresholds {
  return 'RELIGIOUS' in thresholds && 'STANDARD' in thresholds;
}

export const COASTAL_CITIES = new Set([
  'cancun-MX', // Caribbean Sea beaches
  'punta cana-DO', // Caribbean Sea beaches
  'new york-US', // Atlantic Ocean beaches/harbors
  'miami-US', // Atlantic Ocean & Caribbean beaches
  'tokyo-JP', // Tokyo Bay & Pacific Ocean beaches
]);

export function isCityCoastal(city: City): boolean {
  const cityKey = `${city.name.toLowerCase()}-${city.countryCode}`;
  return COASTAL_CITIES.has(cityKey);
}

export const PREDEFINED_CITY_AREAS: Record<string, SearchArea[]> = {
  'New York': [
    {
      name: 'Midtown Manhattan',
      location: { lat: 40.7549, lng: -73.984 },
      radius: 2000,
    },
    {
      name: 'Lower Manhattan',
      location: { lat: 40.7128, lng: -74.006 },
      radius: 2000,
    },
    {
      name: 'Upper East Side',
      location: { lat: 40.7736, lng: -73.9566 },
      radius: 2000,
    },
    {
      name: 'Upper West Side',
      location: { lat: 40.787, lng: -73.9754 },
      radius: 2000,
    },
    {
      name: 'Harlem',
      location: { lat: 40.8116, lng: -73.9465 },
      radius: 2000,
    },
    {
      name: 'East Harlem',
      location: { lat: 40.7957, lng: -73.9389 },
      radius: 1500,
    },
    {
      name: 'Washington Heights',
      location: { lat: 40.8417, lng: -73.9394 },
      radius: 2000,
    },
    {
      name: 'Chelsea',
      location: { lat: 40.7465, lng: -74.0014 },
      radius: 1500,
    },
    {
      name: 'Greenwich Village',
      location: { lat: 40.7336, lng: -74.0027 },
      radius: 1500,
    },
    {
      name: 'SoHo',
      location: { lat: 40.7243, lng: -74.0018 },
      radius: 1500,
    },
    {
      name: 'Tribeca',
      location: { lat: 40.7163, lng: -74.0086 },
      radius: 1500,
    },
    {
      name: 'Financial District',
      location: { lat: 40.7075, lng: -74.0113 },
      radius: 1500,
    },
    {
      name: 'Chinatown',
      location: { lat: 40.7158, lng: -73.997 },
      radius: 1000,
    },
    {
      name: 'Little Italy',
      location: { lat: 40.7191, lng: -73.9973 },
      radius: 1000,
    },
    {
      name: 'Flatiron District',
      location: { lat: 40.7401, lng: -73.9903 },
      radius: 1500,
    },
    {
      name: 'Hells Kitchen',
      location: { lat: 40.7638, lng: -73.9918 },
      radius: 1500,
    },
    {
      name: 'Battery Park City',
      location: { lat: 40.7115, lng: -74.0156 },
      radius: 1000,
    },
  ],
  // Add more cities as needed
};

export const PARK_TYPES = {
  BOTANICAL: new Set([
    'botanical',
    'botanic',
    'arboretum',
    'conservatory',
    'japanese garden',
    'chinese garden',
  ]),
  URBAN: new Set([
    'park',
    'commons',
    'square',
    'plaza',
    'promenade',
    'riverfront park',
    'lakefront park',
  ]),
};

// Place type configurations
export const PLACE_TYPES = {
  PRIMARY: new Set([
    'tourist_attraction',
    'museum',
    'art_gallery',
    'aquarium',
    'amusement_park',
    'park',
    'church',
    'place_of_worship',
    'zoo',
    'landmark',
    'night_club',
    'bar',
    'casino',
    'shopping_mall',
    'department_store',
    'restaurant',
  ] as const),

  SHOPPING: {
    PRIMARY: new Set(['shopping_mall', 'department_store', 'market']),
    KEYWORDS: new Set([
      'mall',
      'outlet',
      'shopping center',
      'plaza',
      'galleria',
      'marketplace',
      'bazaar',
      'shopping district',
    ]),
  },

  BEACH_SEARCH: new Set(['natural_feature', 'point_of_interest']),

  BEACH_INDICATORS: {
    NAMES: new Set([
      'beach',
      'strand',
      'seashore',
      'shore',
      'bay',
      'cove',
      'harbor',
      'pier',
      'boardwalk',
      'waterfront',
    ]),
    NATURAL_FEATURES: new Set(['sand', 'shoreline', 'coastal', 'ocean', 'sea', 'maritime']),
  },

  HISTORIC_INDICATORS: {
    TIME_PERIODS: new Set([
      'century',
      'built in',
      'opened in',
      'founded in',
      'established in',
      'dated',
      'ancient',
      'historic',
      'historical',
      'heritage',
    ]),
    ARCHITECTURAL: new Set([
      'gothic',
      'victorian',
      'colonial',
      'classical',
      'renaissance',
      'baroque',
      'monument',
      'memorial',
      'landmark',
      'ruins',
    ]),
    CULTURAL: new Set([
      'national monument',
      'national historic',
      'preserved',
      'restoration',
      'traditional',
      'original',
    ]),
  },
  NIGHTLIFE: {
    PRIMARY: new Set(['night_club', 'bar', 'casino']),
  },

  BLACKLIST: new Set([
    'food',
    'store',
    'furniture_store',
    'grocery_store',
    'supermarket',
    'cafe',
    'bakery',
    'lodging',
    'hotel',
    'gym',
    'health',
    'beauty_salon',
    'spa',
    'pharmacy',
    'doctor',
    'dentist',
    'bank',
    'finance',
    'real_estate_agency',
    'insurance_agency',
    'car_dealer',
    'car_rental',
    'car_repair',
    'car_wash',
    'gas_station',
    'parking',
    'subway_station',
    'train_station',
    'transit_station',
  ]),
};

// Quality thresholds for different place types
export const THRESHOLDS = {
  [PlaceCategory.MUSEUM]: {
    MIN_RATING: 4.2,
    MIN_REVIEWS: 750,
    EXCEPTIONAL_RATING: 4.6,
    EXCEPTIONAL_REVIEWS: 3000,
  },
  [PlaceCategory.HISTORIC]: {
    RELIGIOUS: {
      MIN_RATING: 4.0,
      MIN_REVIEWS: 500,
    },
    STANDARD: {
      MIN_RATING: 4.3,
      MIN_REVIEWS: 1000,
    },
  },
  [PlaceCategory.ATTRACTION]: {
    MIN_RATING: 4.3,
    MIN_REVIEWS: 1000,
    EXCEPTIONAL_RATING: 4.7,
    EXCEPTIONAL_REVIEWS: 5000,
  },
  [PlaceCategory.PARK]: {
    BOTANICAL: {
      MIN_RATING: 4.2,
      MIN_REVIEWS: 750,
      EXCEPTIONAL_RATING: 4.6,
      EXCEPTIONAL_REVIEWS: 3000,
    },
    URBAN: {
      MIN_RATING: 4.0,
      MIN_REVIEWS: 500,
      EXCEPTIONAL_RATING: 4.5,
      EXCEPTIONAL_REVIEWS: 2000,
    },
  },
  [PlaceCategory.NIGHTLIFE]: {
    MIN_RATING: 4.0,
    MIN_REVIEWS: 500,
    EXCEPTIONAL_RATING: 4.5,
    EXCEPTIONAL_REVIEWS: 2000,
  },
  [PlaceCategory.BEACH]: {
    MIN_RATING: 4.0,
    MIN_REVIEWS: 500,
    EXCEPTIONAL_RATING: 4.5,
    EXCEPTIONAL_REVIEWS: 2000,
  },
  [PlaceCategory.SHOPPING]: {
    MALL: {
      MIN_RATING: 4.0,
      MIN_REVIEWS: 1000,
      EXCEPTIONAL_RATING: 4.5,
      EXCEPTIONAL_REVIEWS: 3000,
    },
    MARKET: {
      MIN_RATING: 4.0,
      MIN_REVIEWS: 500,
      EXCEPTIONAL_RATING: 4.5,
      EXCEPTIONAL_REVIEWS: 2000,
    },
  },
  [PlaceCategory.RESTAURANT]: {
    STANDARD: {
      MIN_RATING: 4.2,
      MIN_REVIEWS: 500,
      EXCEPTIONAL_RATING: 4.5,
      EXCEPTIONAL_REVIEWS: 2000,
    },
    UPSCALE: {
      MIN_RATING: 4.4,
      MIN_REVIEWS: 300,
      EXCEPTIONAL_RATING: 4.6,
      EXCEPTIONAL_REVIEWS: 1500,
    },
  },
};
