import { Activity, TripStatus } from '@prisma/client';
import { DateRange } from 'react-day-picker';

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

export type DietaryOption = 'vegetarian' | 'vegan' | 'halal' | 'kosher' | 'gluten-free' | 'none';
export type BudgetLevel = 'budget' | 'moderate' | 'luxury';

export interface TripPreferences {
  city: City | null;
  dates: DateRange | undefined;
  dietary: DietaryOption[];
  tripVibe: number;
  budget: BudgetLevel;
  pace: number;
  activities: string[];
  customInterests?: string;
  walkingComfort: 'minimal' | 'moderate' | 'lots' | undefined;
}

export type DemoTripPreferences = Omit<TripPreferences, 'city' | 'walkingComfort'>;
export interface DemoActivity {
  id: string;
  name: string;
  type: string;
  address: string;
  startTime: string;
  endTime: string;
  notes?: string;
  latitude: number;
  longitude: number;
  placeId: string;
  priceLevel?: 1 | 2 | 3 | 4;
}

export interface DemoTrip {
  id: string;
  cityData: City;
  preferences: DemoTripPreferences;
  activities?: DemoActivity[];
  createdAt: string;
}

export interface StoredDemoData {
  trip: DemoTrip;
  expiresAt: string; // ISO string
}

export interface DateRangeType {
  from: Date | undefined;
  to: Date | undefined;
}

export interface TripHeaderProps {
  trip: {
    id: string;
    destination: string;
    title?: string;
    placeId?: string | null;
    startDate?: Date;
    endDate?: Date;
    preferences?: TripPreferences;
  };
  showBackButton?: boolean;
  className?: string;
}

export interface TripError {
  code:
    | 'OPENAI_ERROR' // OpenAI API failures
    | 'PLACES_ERROR' // Google Places API issues
    | 'DATABASE_ERROR' // Database operations failed
    | 'TIMEOUT_ERROR' // Generation took too long
    | 'INVALID_PREFERENCES' // User preferences were invalid
    | 'UNKNOWN_ERROR'; // Catch-all for unexpected errors
  message: string;
  details?: string;
  recoverable: boolean; // Whether retry is possible
  timestamp: string;
}

export interface TripGenerationState {
  status: TripStatus;
  progress: number;
  error?: TripError;
  lastUpdateTime: string; // Track when we last had an update
  attemptsCount: number; // Track retry attempts
}

export type ErrorCode =
  | 'OPENAI_ERROR'
  | 'PLACES_ERROR'
  | 'DATABASE_ERROR'
  | 'TIMEOUT_ERROR'
  | 'INVALID_PREFERENCES'
  | 'UNKNOWN_ERROR';

export interface ActivityCardProps {
  activity: DemoActivity | Activity;
  href?: string;
  className?: string;
  onSignUpClick?: () => void;
}
