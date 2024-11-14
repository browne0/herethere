export type ErrorCode =
  | 'OPENAI_ERROR'
  | 'PLACES_ERROR'
  | 'DATABASE_ERROR'
  | 'TIMEOUT_ERROR'
  | 'INVALID_PREFERENCES'
  | 'UNKNOWN_ERROR';

export interface GeneratedActivity {
  name: string;
  category: string;
  address: string;
  day: number;
  startTime: string;
  endTime: string;
  notes: string;
  priceLevel: number;
}
export interface GeneratedDay {
  dayNumber: number;
  activities: GeneratedActivity[];
}

export interface GeneratedTrip {
  days: GeneratedDay[];
}

export interface PlaceDetails {
  placeId: string;
  latitude: number;
  longitude: number;
  address: string;
  types?: string[];
}
