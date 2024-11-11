import { Trip, TripStatus } from '@prisma/client';
import { addDays, parse } from 'date-fns';

import { prisma } from '@/lib/db';

import type { GeneratedActivity, PlaceDetails } from './types';
import { searchPlaces } from '../places';
import { City, TripPreferences } from '../types';

export const GENERATION_TIMEOUT = 120000; // 2 minutes
export const MAX_RETRY_ATTEMPTS = 3;

// Cache with type safety
const placeCache = new Map<
  string,
  {
    details: PlaceDetails;
    timestamp: number;
  }
>();

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function convertTimeToDate(timeStr: string, baseDate: Date): Date {
  // Parse the time string (e.g., "9:30 AM") to get hours and minutes
  const parsedTime = parse(timeStr, 'h:mm a', new Date());

  // Create a new date using the base date and parsed time
  const resultDate = new Date(baseDate);
  resultDate.setHours(parsedTime.getHours());
  resultDate.setMinutes(parsedTime.getMinutes());

  return resultDate;
}

export async function processBatch(
  activities: GeneratedActivity[],
  tripId: string,
  startDate: Date,
  batchSize = 3
): Promise<void> {
  const processedActivities = activities.map(activity => {
    // Calculate the date for this activity based on day number
    const activityDate = addDays(startDate, activity.day - 1);

    return {
      ...activity,
      startTime: convertTimeToDate(activity.startTime, activityDate),
      endTime: convertTimeToDate(activity.endTime, activityDate),
    };
  });

  // Sort activities chronologically
  processedActivities.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  // Process in batches
  for (let i = 0; i < processedActivities.length; i += batchSize) {
    const batch = processedActivities.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async activity => {
        await prisma.activity.create({
          data: {
            tripId,
            name: activity.name,
            type: activity.type,
            startTime: activity.startTime,
            endTime: activity.endTime,
            notes: activity.notes,
          },
        });
      })
    );

    // Small delay between batches
    if (i + batchSize < processedActivities.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

export async function generateTripBackground(
  activities: GeneratedActivity[],
  trip: Trip,
  cityData: City
): Promise<void> {
  try {
    await processBatch(activities, trip.id, trip.startDate);

    void enhancePlacesBackground(trip.id, cityData);
  } catch (error) {
    console.error('Background generation error:', error);
    await prisma.trip.update({
      where: { id: trip.id },
      data: {
        status: TripStatus.ERROR,
      },
    });
  }
}

async function enhancePlacesBackground(tripId: string, cityData: City) {
  try {
    const activities = await prisma.activity.findMany({
      where: { tripId },
    });

    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];

      try {
        const placeDetails = await getPlaceDetails(activity.name, cityData);

        if (placeDetails) {
          await prisma.activity.update({
            where: { id: activity.id },
            data: {
              placeId: placeDetails.placeId,
              latitude: placeDetails.latitude,
              longitude: placeDetails.longitude,
              address: placeDetails.address,
            },
          });
        }
      } catch (error) {
        console.error(`Error enhancing activity ${activity.id}:`, error);
      }
    }

    await prisma.trip.update({
      where: { id: tripId },
      data: {
        status: TripStatus.COMPLETE,
      },
    });
  } catch (error) {
    console.error('Place enhancement error:', error);
    await prisma.trip.update({
      where: { id: tripId },
      data: {
        status: TripStatus.ERROR,
      },
    });
  }
}

export function generatePrompt(cityData: City, preferences: TripPreferences): string {
  if (!preferences.dates?.from || !preferences.dates?.to) {
    throw new Error('Missing trip dates');
  }
  const days =
    Math.ceil(
      (new Date(preferences.dates.to!).getTime() - new Date(preferences.dates.from!).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;

  const tripStyle =
    preferences.tripVibe > 75 ? 'Adventurous' : preferences.tripVibe > 25 ? 'Balanced' : 'Relaxed';

  const activitiesPerDay = tripStyle === 'Adventurous' ? 5 : tripStyle === 'Balanced' ? 4 : 3;

  return `Generate a ${days}-day itinerary of activities for a trip to ${cityData.name} with the following preferences:
  - Budget Level: ${preferences.budget}
  - Dietary Restrictions: ${preferences.dietary.length > 0 ? preferences.dietary.join(', ') : 'none'}
  - Travel Style: ${tripStyle}
  - Pace: ${preferences.pace > 4 ? 'Fast-paced' : preferences.pace > 2 ? 'Moderate' : 'Leisurely'}
  - Walking Comfort: ${preferences.walkingComfort || 'moderate'}
  - Activities: ${preferences.activities?.length > 0 ? preferences.activities.join(', ') : 'all types'}
  ${preferences.customInterests ? `- Special Interests: ${preferences.customInterests}` : ''}
  
  Plan approximately ${activitiesPerDay} activities per day. For each activity, include:
  1. Name (use official, findable place names)
  2. Type (DINING, SIGHTSEEING, ACTIVITY, TRANSPORTATION)
  3. Complete address as it appears on Google Maps
  4. Day number (1 = first day, 2 = second day, etc.)
  5. Start and end times (between 8:00-22:00 ${cityData.name} time)
  6. Brief description/notes
  7. Price level (1-4)

  Important:
  - Use verified, existing places findable on Google Maps
  - Include complete addresses
  - Focus on well-reviewed tourist spots
  - Include a mix of morning, afternoon, and evening activities each day
  - Account for ${preferences.walkingComfort || 'moderate'} walking preference
  - Include appropriate meal times each day
  ${preferences.dietary.length > 0 ? `- Ensure dining spots accommodate: ${preferences.dietary.join(', ')}` : ''}
  
  Response format:

  {
    "activities": [
      {
        "name": "string",
        "type": "string",
        "address": "string",
        "day": number,
        "startTime": "h:mm a",
        "endTime": "h:mm a",
        "notes": "string",
        "priceLevel": number
      }
    ]
  }`;
}

async function getPlaceDetails(activityName: string, cityData: City): Promise<PlaceDetails | null> {
  const cacheKey = `${activityName}-${cityData.name}`;

  const cached = placeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.details;
  }

  try {
    const searchResponse = await searchPlaces({
      query: `${activityName}, ${cityData.name}`,
      locationBias: `circle:20000@${cityData.latitude},${cityData.longitude}`,
    });

    if (searchResponse.candidates?.[0]) {
      const place = searchResponse.candidates[0];
      if (place.place_id && place.geometry?.location) {
        const details: PlaceDetails = {
          placeId: place.place_id,
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          address: place.formatted_address || '',
        };

        placeCache.set(cacheKey, {
          details,
          timestamp: Date.now(),
        });

        return details;
      }
    }
    return null;
  } catch (error) {
    console.error('Place search error:', error);
    return null;
  }
}
