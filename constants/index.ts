import { City } from '@prisma/client';

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

interface CategoryConfig {
  includedTypes: string[];
  excludedTypes: string[];
  excludedPrimaryTypes?: string[];
  requiresValidation: boolean;
}

interface SearchArea {
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  radius: number;
}

export const CategoryMapping: Record<PlaceCategory, CategoryConfig> = {
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
    includedTypes: ['park', 'botanical_garden', 'garden', 'national_park', 'state_park', 'plaza'],
    excludedTypes: [],
    requiresValidation: true,
  },

  [PlaceCategory.NIGHTLIFE]: {
    includedTypes: [
      'night_club',
      'bar',
      'bar_and_grill',
      'casino',
      'comedy_club',
      'karaoke',
      'pub',
      'wine_bar',
    ],
    excludedTypes: [],
    requiresValidation: true,
  },

  [PlaceCategory.BEACH]: {
    includedTypes: ['beach'],
    excludedTypes: [],
    requiresValidation: true,
  },

  [PlaceCategory.SHOPPING]: {
    includedTypes: ['shopping_mall', 'market', 'department_store', 'plaza'],
    excludedTypes: ['convenience_store'],
    requiresValidation: false,
  },

  [PlaceCategory.RESTAURANT]: {
    includedTypes: [
      'afghani_restaurant',
      'african_restaurant',
      'american_restaurant',
      'asian_restaurant',
      'brazilian_restaurant',
      'chinese_restaurant',
      'french_restaurant',
      'greek_restaurant',
      'indian_restaurant',
      'italian_restaurant',
      'japanese_restaurant',
      'korean_restaurant',
      'lebanese_restaurant',
      'mexican_restaurant',
      'middle_eastern_restaurant',
      'seafood_restaurant',
      'spanish_restaurant',
      'steak_house',
      'thai_restaurant',
      'turkish_restaurant',
      'vietnamese_restaurant',
      'fine_dining_restaurant',
    ],
    excludedTypes: ['fast_food_restaurant', 'cafeteria'],
    requiresValidation: true,
  },
};

// Used to determine beach/coastal feature search
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

export function isCityCoastal(city: City): boolean {
  const cityKey = `${city.name.toLowerCase()}-${city.countryCode}`;
  return COASTAL_CITIES.has(cityKey);
}

// Predefined search areas for major cities
export const PREDEFINED_CITY_AREAS: Record<string, SearchArea[]> = {
  'New York': [
    {
      name: 'Midtown Manhattan',
      location: { latitude: 40.7549, longitude: -73.984 },
      radius: 2000,
    },
    {
      name: 'Lower Manhattan',
      location: { latitude: 40.7128, longitude: -74.006 },
      radius: 2000,
    },
    {
      name: 'Upper East Side',
      location: { latitude: 40.7736, longitude: -73.9566 },
      radius: 2000,
    },
    {
      name: 'Upper West Side',
      location: { latitude: 40.787, longitude: -73.9754 },
      radius: 2000,
    },
    {
      name: 'Harlem',
      location: { latitude: 40.8116, longitude: -73.9465 },
      radius: 2000,
    },
    {
      name: 'Greenwich Village',
      location: { latitude: 40.7336, longitude: -74.0027 },
      radius: 1500,
    },
    {
      name: 'SoHo',
      location: { latitude: 40.7243, longitude: -74.0018 },
      radius: 1500,
    },
    {
      name: 'Financial District',
      location: { latitude: 40.7075, longitude: -74.0113 },
      radius: 1500,
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

// Historical indicators - used for validation
export const HISTORICAL_INDICATORS = {
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
};

// Beach/Waterfront indicators
export const BEACH_INDICATORS = {
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
};

// Park subtypes
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

// Upscale restaurant indicators
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
