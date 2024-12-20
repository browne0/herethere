import { AddressType } from '@googlemaps/google-maps-services-js';

type GooglePlaceTypeArray = AddressType[];

export const ACTIVITY_CATEGORIES = {
  BEACHES: {
    id: 'beaches',
    label: 'Beaches',
    description: 'Beach activities & waterfront',
    googlePlaceTypes: [AddressType.natural_feature, AddressType.park] as GooglePlaceTypeArray,
  },
  CITY_SIGHTSEEING: {
    id: 'city_sightseeing',
    label: 'City sightseeing',
    description: 'Landmarks & urban exploring',
    googlePlaceTypes: [
      AddressType.tourist_attraction,
      AddressType.museum,
      AddressType.art_gallery,
      AddressType.church,
      AddressType.point_of_interest,
    ] as GooglePlaceTypeArray,
  },
  OUTDOOR_ADVENTURES: {
    id: 'outdoor_adventures',
    label: 'Outdoor adventures',
    description: 'Hiking & nature activities',
    googlePlaceTypes: [
      AddressType.park,
      AddressType.natural_feature,
      AddressType.campground,
    ] as GooglePlaceTypeArray,
  },
  FESTIVALS_EVENTS: {
    id: 'festivals_events',
    label: 'Festivals/events',
    description: 'Local events & culture',
    googlePlaceTypes: [
      AddressType.establishment,
      AddressType.point_of_interest,
    ] as GooglePlaceTypeArray,
  },
  FOOD_EXPLORATION: {
    id: 'food_exploration',
    label: 'Food exploration',
    description: 'Restaurants & culinary experiences',
    googlePlaceTypes: [
      AddressType.restaurant,
      AddressType.cafe,
      AddressType.food,
      AddressType.bakery,
    ] as GooglePlaceTypeArray,
  },
  NIGHTLIFE: {
    id: 'nightlife',
    label: 'Nightlife',
    description: 'Bars & evening entertainment',
    googlePlaceTypes: [
      AddressType.bar,
      AddressType.night_club,
      AddressType.casino,
    ] as GooglePlaceTypeArray,
  },
  SPA_WELLNESS: {
    id: 'spa_wellness',
    label: 'Spa wellness',
    description: 'Relaxation & wellness',
    googlePlaceTypes: [
      AddressType.spa,
      AddressType.health,
      AddressType.gym,
    ] as GooglePlaceTypeArray,
  },
} as const;
export type ActivityCategory = keyof typeof ACTIVITY_CATEGORIES;

export type ActivityCategoryDetails = (typeof ACTIVITY_CATEGORIES)[ActivityCategory];

export const ACTIVITY_CATEGORY_LIST = Object.values(ACTIVITY_CATEGORIES);

export type ActivityCategoryId = (typeof ACTIVITY_CATEGORIES)[ActivityCategory]['id'];
