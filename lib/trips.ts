export const dietaryOptions = [
  { id: 'vegetarian' as const, label: 'Vegetarian', icon: '🥗' },
  { id: 'vegan' as const, label: 'Vegan', icon: '🌱' },
  { id: 'halal' as const, label: 'Halal', icon: '🥩' },
  { id: 'kosher' as const, label: 'Kosher', icon: '✡️' },
  { id: 'gluten-free' as const, label: 'Gluten Free', icon: '🌾' },
  { id: 'none' as const, label: 'No Restrictions', icon: '🍽️' },
];

export const budgetOptions = [
  {
    id: 'budget' as const,
    label: 'Budget Friendly',
    icon: '💰',
    description: 'Affordable adventures',
  },
  { id: 'moderate' as const, label: 'Moderate', icon: '💰💰', description: 'Balanced spending' },
  { id: 'luxury' as const, label: 'Luxury', icon: '💰💰💰', description: 'Premium experiences' },
];

export const popularDestinations = [
  {
    name: 'Tokyo',
    country: 'Japan',
    placeId: 'ChIJ51cu8IcbXWARiRtXIothAS4', // Tokyo's place ID
    location: { lat: 35.6762, lng: 139.6503 },
    countryCode: 'JP',
    timezone: 'Asia/Tokyo',
  },
  {
    name: 'Paris',
    country: 'France',
    placeId: 'ChIJD7fiBh9u5kcRYJSMaMOCCwQ', // Paris' place ID
    location: { lat: 48.8566, lng: 2.3522 },
    countryCode: 'FR',
    timezone: 'Europe/Paris',
  },
  {
    name: 'New York',
    country: 'USA',
    placeId: 'ChIJOwg_06VPwokRYv534QaPC8g', // NYC's place ID
    location: { lat: 40.7128, lng: -74.006 },
    countryCode: 'US',
    timezone: 'America/New_York',
  },
  {
    name: 'Barcelona',
    country: 'Spain',
    placeId: 'ChIJ5TCOcRaYpBIRCmZHTz37sEQ', // Barcelona's place ID
    location: { lat: 41.3874, lng: 2.1686 },
    countryCode: 'ES',
    timezone: 'Europe/Madrid',
  },
];

export interface RouteSegment {
  distance: string;
  duration: string;
  startActivity: {
    id: string;
    name: string;
    category: string;
    startTime: string;
    endTime: string;
  };
  endActivity: {
    id: string;
    name: string;
    category: string;
    startTime: string;
    endTime: string;
  };
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}
