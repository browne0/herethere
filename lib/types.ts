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
