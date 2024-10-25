import { Trip, Activity } from '@prisma/client';

export interface CreateTripInput {
  title: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  preferences: {
    dietary: string[];
    interests: string[];
    budget: 'LOW' | 'MEDIUM' | 'HIGH';
  };
}

export type TripWithActivities = Trip & {
  activities: Activity[];
};

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

export type Location = {
  address: string;
  latitude?: number;
  longitude?: number;
};
