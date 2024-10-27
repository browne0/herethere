export interface UserPreferences {
  dietary?: string[]; // e.g., ['vegetarian', 'gluten-free']
  interests?: string[]; // e.g., ['sightseeing', 'food']
  budget?: 'LOW' | 'MEDIUM' | 'HIGH';
  travelStyle?: string[]; // e.g., ['adventure', 'relaxation']
  accessibility?: string[]; // e.g., ['wheelchair', 'step-free']
  notifications?: {
    email?: boolean;
    push?: boolean;
  };
}

export interface Location {
  address: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  name?: string;
}

export interface MapViewport {
  center: {
    lat: number;
    lng: number;
  };
  zoom: number;
}

export type ActivitySearchType =
  | 'DINING'
  | 'SIGHTSEEING'
  | 'ACCOMMODATION'
  | 'TRANSPORTATION'
  | 'OTHER';

export interface CityBounds {
  ne: {
    lat: number;
    lng: number;
  };
  sw: {
    lat: number;
    lng: number;
  };
}

export function isCityBounds(value: unknown): value is CityBounds {
  if (!value || typeof value !== 'object') return false;

  const bounds = value as any;
  return (
    bounds.ne &&
    typeof bounds.ne.lat === 'number' &&
    typeof bounds.ne.lng === 'number' &&
    bounds.sw &&
    typeof bounds.sw.lat === 'number' &&
    typeof bounds.sw.lng === 'number'
  );
}

export interface Trip {
  id: string;
  userId: string;
  title: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  cityBounds: CityBounds | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface City {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  placeId: string;
  bounds?: CityBounds;
}

export interface NavItem {
  title: string;
  href: string;
}

export interface Feature {
  title: string;
  description: string;
  icon: React.ComponentType;
}

export interface Destination {
  city: string;
  description: string;
  imageUrl: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface Step {
  title: string;
  description: string;
  icon: React.ComponentType;
}

export interface Stat {
  value: number;
  label: string;
}
