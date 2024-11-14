import * as z from 'zod';

import { City, TripPreferences } from '../types';

export interface ActivityGenerationRequest {
  tripId: string;
  city: City;
  preferences: TripPreferences;
}

export const activitySchema = z.object({
  name: z.string(),
  category: z.string(),
  address: z.string(),
  startTime: z.string(), // Note: Keep as string for JSON
  endTime: z.string(), // Note: Keep as string for JSON
  notes: z.string(),
  day: z.number(),
  priceLevel: z.number(),
});

export const activitiesSchema = z.object({
  activities: z.array(activitySchema),
});
