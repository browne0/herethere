import { AddressType } from '@googlemaps/google-maps-services-js';

type GooglePlaceTypeArray = AddressType[];

export const ATTRACTION_CATEGORIES = {
  ICONIC_LANDMARKS: {
    id: 'iconic_landmarks',
    label: 'Iconic Landmarks',
    description: 'Must-see landmarks & monuments',
    googlePlaceTypes: [
      AddressType.tourist_attraction,
      AddressType.landmark,
    ] as GooglePlaceTypeArray,
    defaultDuration: 60,
    typicalPrice: 0,
  },

  MUSEUMS_GALLERIES: {
    id: 'museums_galleries',
    label: 'Museums & Galleries',
    description: 'World-class museums and art galleries',
    googlePlaceTypes: [
      AddressType.museum,
      AddressType.art_gallery,
      AddressType.library, // Some historic libraries are attractions
    ] as GooglePlaceTypeArray,
    defaultDuration: 120,
    typicalPrice: 2500,
  },

  HISTORIC_SITES: {
    id: 'historic_sites',
    label: 'Historic Sites',
    description: 'Historical places & heritage sites',
    googlePlaceTypes: [
      AddressType.church,
      AddressType.synagogue,
      AddressType.mosque,
      AddressType.hindu_temple,
    ] as GooglePlaceTypeArray,
    defaultDuration: 45,
    typicalPrice: 0,
  },

  URBAN_PARKS: {
    id: 'urban_parks',
    label: 'Parks & Gardens',
    description: 'Famous parks and public spaces',
    googlePlaceTypes: [AddressType.park, AddressType.natural_feature] as GooglePlaceTypeArray,
    defaultDuration: 90,
    typicalPrice: 0,
  },

  OBSERVATION_POINTS: {
    id: 'observation_points',
    label: 'City Views',
    description: 'Observation decks & viewpoints',
    googlePlaceTypes: [
      AddressType.premise, // For specific buildings like Empire State
      AddressType.establishment,
    ] as GooglePlaceTypeArray,
    defaultDuration: 60,
    typicalPrice: 3500,
  },

  ENTERTAINMENT_VENUES: {
    id: 'entertainment_venues',
    label: 'Entertainment Venues',
    description: 'Famous theaters & entertainment spots',
    googlePlaceTypes: [
      AddressType.stadium,
      AddressType.amusement_park,
      AddressType.casino,
      AddressType.aquarium,
      AddressType.zoo,
    ] as GooglePlaceTypeArray,
    defaultDuration: 180,
    typicalPrice: 7500,
  },

  FAMOUS_MARKETS: {
    id: 'famous_markets',
    label: 'Famous Markets',
    description: 'Historic markets & food halls',
    googlePlaceTypes: [
      AddressType.shopping_mall,
      AddressType.department_store,
    ] as GooglePlaceTypeArray,
    defaultDuration: 60,
    typicalPrice: 0,
  },

  ARCHITECTURAL_WONDERS: {
    id: 'architectural_wonders',
    label: 'Architectural Wonders',
    description: 'Remarkable buildings & structures',
    googlePlaceTypes: [
      AddressType.lodging, // For famous hotels
      AddressType.train_station, // For grand stations like Grand Central
    ] as GooglePlaceTypeArray,
    defaultDuration: 45,
    typicalPrice: 0,
  },
} as const;

export type AttractionCategory = keyof typeof ATTRACTION_CATEGORIES;
export type AttractionCategoryDetails = (typeof ATTRACTION_CATEGORIES)[AttractionCategory];
export const ATTRACTION_CATEGORY_LIST = Object.values(ATTRACTION_CATEGORIES);

// Helper function to determine category
export function determineAttractionCategory(placeTypes: string[]): AttractionCategory {
  for (const [categoryId, category] of Object.entries(ATTRACTION_CATEGORIES)) {
    const matches = placeTypes.some(placeType =>
      category.googlePlaceTypes.includes(placeType as AddressType)
    );

    if (matches) {
      return categoryId as AttractionCategory;
    }
  }

  return 'ICONIC_LANDMARKS';
}
