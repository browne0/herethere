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

export interface CreateActivityInput {
  tripId: string;
  type: 'FOOD' | 'SIGHTSEEING' | 'SPORT' | 'NIGHTLIFE';
  name: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  startTime: Date;
  endTime: Date;
  notes?: string;
}

export type TripWithActivities = Trip & {
  activities: Activity[];
};
