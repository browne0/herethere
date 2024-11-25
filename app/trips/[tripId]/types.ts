import type { Trip, ActivityRecommendation, ItineraryActivity, City } from '@prisma/client';

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
  placeId?: string;
}

export interface ParsedItineraryActivity extends Omit<ItineraryActivity, 'customizations'> {
  recommendation: ActivityRecommendation;
  customizations?: {
    duration?: number;
    notes?: string;
    private?: boolean;
  };
}

export interface ActivityShelf {
  title: string;
  type: string;
  activities: ActivityRecommendation[];
}

export interface ParsedTrip extends Omit<Trip, 'activities' | 'preferences'> {
  activities: ParsedItineraryActivity[];
  city: City;
  preferences?: {
    budget?: string;
    activities?: string[];
  };
}
