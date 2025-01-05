import { City } from '@prisma/client';

import { TripBudget } from '@/app/trips/[tripId]/types';
import { Cuisine, DietaryRestriction } from '@/lib/stores/preferences';

export enum PlaceCategory {
  MUSEUM = 'MUSEUM',
  HISTORIC = 'HISTORIC',
  ATTRACTION = 'ATTRACTION',
  PARK = 'PARK',
  NIGHTLIFE = 'NIGHTLIFE',
  BEACH = 'BEACH',
  RESTAURANT = 'RESTAURANT',
  SPA = 'SPA',
}

// Single source of truth for restaurant types
export const RESTAURANT_TYPES = {
  afghani_restaurant: 'Afghani',
  african_restaurant: 'African',
  asian_restaurant: 'Asian',
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
  spanish_restaurant: 'Latin',
  thai_restaurant: 'Thai',
  turkish_restaurant: 'Turkish',
  vietnamese_restaurant: 'Vietnamese',
  pizza_restaurant: 'Pizza',
  barbecue_restaurant: 'Barbecue',
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
  .map(([key, label]) => ({
    label,
    value: key.replace('_restaurant', '') as Cuisine,
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

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
    includedTypes: [
      ...Object.keys(RESTAURANT_TYPES),
      'pizza_restaurant',
      'ramen_restaurant',
      'sandwich_shop',
      'sushi_restaurant',
      'fine_dining_restaurant',
      'steak_house',
      'barbecue_restaurant',
    ],
    excludedTypes: ['fast_food_restaurant', 'cafeteria', 'grocery_store'],
    requiresValidation: true,
  },
  [PlaceCategory.SPA]: {
    includedTypes: ['spa', 'sauna', 'massage'],
    excludedTypes: [
      'doctor',
      'skin_care_clinic',
      'medical_lab',
      'chiropractor',
      'hospital',
      'beauty_salon',
      'beautician',
      'gym',
      'physiotherapist',
    ],
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
  'New York': [
    {
      name: 'Times Square',
      location: { latitude: 40.758, longitude: -73.9855 },
      radius: 1000,
    },
    {
      name: 'Midtown East',
      location: { latitude: 40.7587, longitude: -73.9787 },
      radius: 1000,
    },
    {
      name: 'Koreatown',
      location: { latitude: 40.7464, longitude: -73.9857 },
      radius: 1000,
    },
    {
      name: 'Central Park South',
      location: { latitude: 40.7651, longitude: -73.9767 },
      radius: 1200,
    },
    {
      name: 'Central Park North',
      location: { latitude: 40.7852, longitude: -73.9683 },
      radius: 1200,
    },
    {
      name: 'Upper East Side',
      location: { latitude: 40.7789, longitude: -73.9622 },
      radius: 1500,
    },
    {
      name: 'Upper West Side',
      location: { latitude: 40.7825, longitude: -73.9754 },
      radius: 1500,
    },
    {
      name: 'Greenwich Village',
      location: { latitude: 40.732, longitude: -73.9977 },
      radius: 1200,
    },
    {
      name: 'SoHo',
      location: { latitude: 40.7225, longitude: -73.9982 },
      radius: 1200,
    },
    {
      name: 'Financial District',
      location: { latitude: 40.7115, longitude: -74.012 },
      radius: 1500,
    },
    {
      name: 'Chelsea',
      location: { latitude: 40.7466, longitude: -74.0009 },
      radius: 1200,
    },
    {
      name: 'East Village',
      location: { latitude: 40.7265, longitude: -73.9815 },
      radius: 1000,
    },
    {
      name: 'Chinatown',
      location: { latitude: 40.7156, longitude: -73.995 },
      radius: 1200,
    },
    {
      name: 'Williamsburg',
      location: { latitude: 40.7081, longitude: -73.9571 },
      radius: 1500,
    },
    {
      name: 'DUMBO',
      location: { latitude: 40.7032, longitude: -73.9892 },
      radius: 1000,
    },
    {
      name: 'Brooklyn Heights',
      location: { latitude: 40.696, longitude: -73.9949 },
      radius: 1000,
    },
  ],

  'San Francisco': [
    {
      name: 'Downtown/Union Square',
      location: { latitude: 37.7879, longitude: -122.4075 },
      radius: 1500,
    },
    {
      name: "Fisherman's Wharf",
      location: { latitude: 37.808, longitude: -122.4177 },
      radius: 1500,
    },
    {
      name: 'North Beach',
      location: { latitude: 37.7999, longitude: -122.407 },
      radius: 1500,
    },
    {
      name: 'Mission District',
      location: { latitude: 37.7599, longitude: -122.4148 },
      radius: 2000,
    },
    {
      name: 'Hayes Valley',
      location: { latitude: 37.7759, longitude: -122.4245 },
      radius: 1500,
    },
    {
      name: 'Castro',
      location: { latitude: 37.7609, longitude: -122.435 },
      radius: 1500,
    },
  ],

  Tokyo: [
    {
      name: 'Shinjuku',
      location: { latitude: 35.6938, longitude: 139.7034 },
      radius: 2000,
    },
    {
      name: 'Shibuya',
      location: { latitude: 35.658, longitude: 139.7016 },
      radius: 2000,
    },
    {
      name: 'Ginza',
      location: { latitude: 35.6721, longitude: 139.7636 },
      radius: 1500,
    },
    {
      name: 'Asakusa',
      location: { latitude: 35.7147, longitude: 139.7967 },
      radius: 1500,
    },
    {
      name: 'Roppongi',
      location: { latitude: 35.6627, longitude: 139.7307 },
      radius: 1500,
    },
  ],

  London: [
    {
      name: 'West End',
      location: { latitude: 51.5134, longitude: -0.1362 },
      radius: 2000,
    },
    {
      name: 'City of London',
      location: { latitude: 51.5155, longitude: -0.0922 },
      radius: 2000,
    },
    {
      name: 'South Bank',
      location: { latitude: 51.505, longitude: -0.1171 },
      radius: 1500,
    },
    {
      name: 'Westminster',
      location: { latitude: 51.4975, longitude: -0.1357 },
      radius: 1500,
    },
    {
      name: 'Camden',
      location: { latitude: 51.539, longitude: -0.1426 },
      radius: 1500,
    },
  ],
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

export const BUDGET_OPTIONS: { label: string; value: TripBudget }[] = [
  { label: 'Budget', value: 'budget' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Luxury', value: 'luxury' },
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
