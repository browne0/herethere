import { AddressType } from '@googlemaps/google-maps-services-js';

type GooglePlaceTypeArray = AddressType[];

interface AttractionCategoryDetails {
  id: string;
  label: string;
  description: string;
  googlePlaceTypes: GooglePlaceTypeArray;
  defaultDuration: number;
  typicalPrice: number;
  requiresTypes?: AddressType[]; // Optional property
  requiresRating?: number; // Optional property
  minReviews?: number; // Optional property
}

export const ATTRACTION_CATEGORIES: Record<string, AttractionCategoryDetails> = {
  ICONIC_LANDMARKS: {
    id: 'iconic_landmarks',
    label: 'Iconic Landmarks',
    description: 'Must-see landmarks & monuments',
    googlePlaceTypes: [
      AddressType.tourist_attraction,
      AddressType.landmark,
      AddressType.point_of_interest, // Only when combined with tourist_attraction
    ] as GooglePlaceTypeArray,
    defaultDuration: 60,
    typicalPrice: 0,
    requiresTypes: [AddressType.tourist_attraction], // Must have this type
  },

  MUSEUMS_GALLERIES: {
    id: 'museums_galleries',
    label: 'Museums & Galleries',
    description: 'World-class museums and art galleries',
    googlePlaceTypes: [AddressType.museum, AddressType.art_gallery] as GooglePlaceTypeArray,
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
    requiresRating: 4.5, // Higher standard for religious sites
  },

  URBAN_PARKS: {
    id: 'urban_parks',
    label: 'Parks & Gardens',
    description: 'Famous parks and public spaces',
    googlePlaceTypes: [AddressType.park, AddressType.natural_feature] as GooglePlaceTypeArray,
    defaultDuration: 90,
    typicalPrice: 0,
    minReviews: 2000, // Parks should have lots of reviews to be significant
  },

  ENTERTAINMENT_VENUES: {
    id: 'entertainment_venues',
    label: 'Entertainment Venues',
    description: 'Famous theaters & entertainment spots',
    googlePlaceTypes: [
      AddressType.stadium,
      AddressType.amusement_park,
      AddressType.aquarium,
      AddressType.zoo,
    ] as GooglePlaceTypeArray,
    defaultDuration: 180,
    typicalPrice: 7500,
  },
} as const;

export type AttractionCategory = keyof typeof ATTRACTION_CATEGORIES;
export const ATTRACTION_CATEGORY_LIST = Object.values(ATTRACTION_CATEGORIES);
