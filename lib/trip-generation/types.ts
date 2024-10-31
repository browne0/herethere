export type TripStatus = 'draft' | 'generating' | 'basic_ready' | 'complete' | 'error';

export type ErrorCode =
  | 'OPENAI_ERROR'
  | 'PLACES_ERROR'
  | 'DATABASE_ERROR'
  | 'TIMEOUT_ERROR'
  | 'INVALID_PREFERENCES'
  | 'UNKNOWN_ERROR';

export interface GeneratedActivity {
  name: string;
  type: 'DINING' | 'SIGHTSEEING' | 'ACTIVITY' | 'TRANSPORTATION';
  address: string;
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
}
