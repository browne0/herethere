import type { Trip, ActivityRecommendation, ItineraryActivity, City } from '@prisma/client';

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
  placeId?: string;
}

export interface ParsedActivityRecommendation
  extends Omit<
    ActivityRecommendation,
    'location' | 'images' | 'availableDays' | 'openingHours' | 'seasonality' | 'tags'
  > {
  location: Location;
  images: { urls: string[] };
  availableDays: { days: number[] };
  openingHours?: {
    periods: Array<{
      open: { day: number; time: string };
      close: { day: number; time: string };
    }>;
  };
  seasonality: { seasons: string[] };
  tags: { tags: string[] };
}

export interface ParsedItineraryActivity extends Omit<ItineraryActivity, 'customizations'> {
  recommendation: ParsedActivityRecommendation;
  customizations?: {
    duration?: number;
    notes?: string;
    private?: boolean;
  };
}

export interface ActivityShelf {
  title: string;
  type: string;
  activities: ParsedActivityRecommendation[];
}

export interface ParsedTrip extends Omit<Trip, 'activities' | 'preferences'> {
  activities: ParsedItineraryActivity[];
  city: City;
  preferences?: {
    budget?: string;
    activities?: string[];
  };
}
