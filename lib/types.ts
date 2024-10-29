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
    preferences?: {
      dates?: {
        from: string | Date;
        to: string | Date;
      };
      dietary?: string[];
      tripVibe?: number;
      pace?: number;
    };
  };
  showBackButton?: boolean;
  className?: string;
}
