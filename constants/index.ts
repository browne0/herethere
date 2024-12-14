import { City } from '@prisma/client';

import { Cuisine, DietaryRestriction } from '@/lib/stores/preferences';

export enum PlaceCategory {
  MUSEUM = 'MUSEUM',
  HISTORIC = 'HISTORIC',
  ATTRACTION = 'ATTRACTION',
  PARK = 'PARK',
  NIGHTLIFE = 'NIGHTLIFE',
  BEACH = 'BEACH',
  RESTAURANT = 'RESTAURANT',
}

// Single source of truth for restaurant types
export const RESTAURANT_TYPES = {
  afghani_restaurant: 'Afghani',
  african_restaurant: 'African',
  american_restaurant: 'American',
  brazilian_restaurant: 'Brazilian',
  chinese_restaurant: 'Chinese',
  french_restaurant: 'French',
  greek_restaurant: 'Greek',
  indian_restaurant: 'Indian',
  italian_restaurant: 'Italian',
  japanese_restaurant: 'Japanese',
  korean_restaurant: 'Korean',
  lebanese_restaurant: 'Lebanese',
  mexican_restaurant: 'Mexican',
  middle_eastern_restaurant: 'Middle Eastern',
  seafood_restaurant: 'Seafood',
  spanish_restaurant: 'Spanish',
  steak_house: 'Steak House',
  thai_restaurant: 'Thai',
  turkish_restaurant: 'Turkish',
  vietnamese_restaurant: 'Vietnamese',
  fine_dining_restaurant: 'Fine Dining',
};

export const MUSEUM_TYPES = {
  museum: 'Museum',
  art_gallery: 'Art Gallery',
  planetarium: 'Planetarium',
};

// Derive other restaurant-related constants
export const GOOGLE_RESTAURANT_TYPES = Object.keys(RESTAURANT_TYPES);

export const CUISINE_PREFERENCES: Array<{ label: string; value: Cuisine }> = Object.entries(
  RESTAURANT_TYPES
)
  .filter(([key]) => !key.includes('steak_house') && !key.includes('fine_dining'))
  .map(([key, label]) => ({
    label,
    value: key.replace('_restaurant', '') as Cuisine,
  }));

// Place type indicators consolidated
export const PLACE_INDICATORS = {
  HISTORICAL: {
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
  BEACH: {
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
  PARK: {
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
  },
};

export const CategoryMapping = {
  [PlaceCategory.MUSEUM]: {
    includedTypes: ['museum', 'art_gallery', 'planetarium'],
    excludedTypes: [],
    requiresValidation: false,
  },
  [PlaceCategory.HISTORIC]: {
    includedTypes: [
      'historical_place',
      'historical_landmark',
      'cultural_landmark',
      'monument',
      'church',
      'hindu_temple',
      'mosque',
      'synagogue',
    ],
    excludedTypes: [],
    requiresValidation: true,
  },
  [PlaceCategory.ATTRACTION]: {
    includedTypes: [
      'tourist_attraction',
      'amusement_park',
      'aquarium',
      'zoo',
      'observation_deck',
      'water_park',
      'wildlife_park',
      'botanical_garden',
    ],
    excludedTypes: [],
    requiresValidation: false,
  },
  [PlaceCategory.PARK]: {
    includedTypes: ['park', 'botanical_garden', 'garden', 'national_park', 'state_park'],
    excludedTypes: [],
    requiresValidation: true,
  },
  [PlaceCategory.NIGHTLIFE]: {
    includedTypes: ['night_club', 'bar', 'casino', 'comedy_club', 'karaoke', 'pub', 'wine_bar'],
    excludedTypes: [],
    requiresValidation: true,
  },
  [PlaceCategory.BEACH]: {
    includedTypes: ['beach'],
    excludedTypes: [],
    requiresValidation: true,
  },
  [PlaceCategory.RESTAURANT]: {
    includedTypes: Object.keys(RESTAURANT_TYPES),
    excludedTypes: ['fast_food_restaurant', 'cafeteria', 'grocery_store'],
    requiresValidation: true,
  },
};

export const COASTAL_CITIES = new Set([
  'cancun-MX',
  'punta cana-DO',
  'new york-US',
  'miami-US',
  'tokyo-JP',
  'san francisco-US',
  'los angeles-US',
  'vancouver-CA',
  'sydney-AU',
  'rio de janeiro-BR',
  'barcelona-ES',
  'dubai-AE',
]);

export const PREDEFINED_CITY_AREAS: Record<string, SearchArea[]> = {
  // [Previous predefined city areas remain unchanged]
};

export function isCityCoastal(city: City): boolean {
  const cityKey = `${city.name.toLowerCase()}-${city.countryCode}`;
  return COASTAL_CITIES.has(cityKey);
}

export const DIETARY_RESTRICTIONS: Array<{ label: string; value: DietaryRestriction }> = [
  { label: 'No dietary restrictions', value: 'none' },
  { label: 'Vegetarian', value: 'vegetarian' },
  { label: 'Vegan', value: 'vegan' },
];

export const NON_VEGETARIAN_RESTAURANTS = ['seafood_restaurant', 'steak_house'];

export const UPSCALE_RESTAURANT_INDICATORS = new Set([
  'michelin',
  'fine dining',
  'upscale',
  'gourmet',
  'haute cuisine',
  'chef',
  'luxury',
  'elegant',
  'sophisticated',
]);

interface SearchArea {
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  radius: number;
}

export const fieldMask = [
  // Basic fields
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.types',
  'places.primaryType',
  'places.photos',
  'places.businessStatus',
  'places.editorialSummary',

  // Advanced fields
  'places.priceLevel',
  'places.rating',
  'places.userRatingCount',
  'places.regularOpeningHours',

  // Features we use
  'places.dineIn',
  'places.reservable',
  'places.servesLunch',
  'places.servesDinner',
  'places.servesBeer',
  'places.servesWine',
  'places.servesCocktails',
  'places.servesVegetarianFood',
  'places.outdoorSeating',
  'places.delivery',
  'places.takeout',
].join(',');
