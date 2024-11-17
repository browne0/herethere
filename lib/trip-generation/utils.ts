import { AddressType } from '@googlemaps/google-maps-services-js';
import { Trip, TripStatus } from '@prisma/client';
import { addDays } from 'date-fns';

import { prisma } from '@/lib/db';

import type { GeneratedActivity, PlaceDetails } from './types';
import { searchPlaces } from '../places';
import { City, TripPreferences } from '../types';
import { ACTIVITY_CATEGORIES } from '../types/activities';

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

function convertTimeToDate(timeStr: string, baseDate: Date, timeZone: string): Date {
  const parsedDate = new Date(timeStr);
  if (isNaN(parsedDate.getTime())) {
    throw new Error(`Invalid date format: ${timeStr}`);
  }

  // Create a formatter that will give us time in the city's timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const localDate = new Date(formatter.format(baseDate));
  localDate.setHours(parsedDate.getHours());
  localDate.setMinutes(parsedDate.getMinutes());
  localDate.setSeconds(0);

  return localDate;
}

export async function processActivities(
  activities: GeneratedActivity[],
  trip: Trip
): Promise<void> {
  const existingActivities = await prisma.activity.findMany({
    where: { tripId: trip.id },
    select: { id: true },
  });

  if (existingActivities.length > 0) {
    console.log('Activities already exist for this trip, skipping batch processing');
    return;
  }

  const processedActivities = activities.map(activity => {
    const activityDate = addDays(trip.startDate, activity.day - 1);

    const categoryEntry = Object.entries(ACTIVITY_CATEGORIES).find(
      ([_, category]) => category.label === activity.category
    );
    const category = categoryEntry ? categoryEntry[1].id : 'unknown';

    return {
      name: activity.name,
      category,
      startTime: convertTimeToDate(activity.startTime, activityDate, trip.timeZone),
      endTime: convertTimeToDate(activity.endTime, activityDate, trip.timeZone),
      notes: activity.notes,
    };
  });

  // Single bulk create operation
  await prisma.activity.createMany({
    data: processedActivities.map(activity => ({
      tripId: trip.id,
      ...activity,
    })),
  });
}

export async function generateTripBackground(
  activities: GeneratedActivity[],
  trip: Trip,
  cityData: City
): Promise<void> {
  try {
    await processActivities(activities, trip);

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
          const activityCategory =
            ACTIVITY_CATEGORIES[activity.category as keyof typeof ACTIVITY_CATEGORIES];
          const matchedPlaceType = placeDetails.types?.find(type =>
            activityCategory?.googlePlaceTypes.includes(type as AddressType)
          );

          await prisma.activity.update({
            where: { id: activity.id },
            data: {
              placeId: placeDetails.placeId,
              placeType: matchedPlaceType,
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

export function generatePrompt(
  cityData: City,
  preferences: TripPreferences,
  tripTimeZone: string
): string {
  if (!preferences.dates?.from || !preferences.dates?.to) {
    throw new Error('Missing trip dates');
  }
  const days =
    Math.ceil(
      (new Date(preferences.dates.to).getTime() - new Date(preferences.dates.from).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;

  const tripStyle =
    preferences.tripVibe > 75 ? 'Adventurous' : preferences.tripVibe > 25 ? 'Balanced' : 'Relaxed';

  const activitiesPerDay =
    preferences.tripVibe > 75
      ? 6 // Adventurous
      : preferences.tripVibe > 25
        ? 5 // Balanced
        : 4; // Relaxed

  return `Create a ${days}-day ${cityData.name} itinerary using timezone: ${tripTimeZone}.

  CRITICAL REQUIREMENT: ALL activities MUST be located IN ${cityData.name} proper - not in other countries or nearby cities.

    IMPORTANT: Generate EXACTLY ${activitiesPerDay} activities per day, (no more, no fewer) including:
      - Must include both lunch and dinner each day
      - Remaining ${activitiesPerDay - 2} slots should be a mix of:
        * Morning activities (9:00-12:00)
        * Afternoon activities (14:00-17:00)
        * Evening activities (17:00-22:00)

    STRICT TIME RULES (ALL TIMES IN ${tripTimeZone}):
    - Morning activities: 09:00 to 12:00
    - Lunch: 12:00 to 14:00
    - Afternoon activities: 14:00 to 17:00
    - Evening activities: 17:00 to 19:00
    - Dinner: 19:00 to 21:00
    - Late evening activities (if any): until 22:00

    ALL times MUST be provided in ISO 8601 format with the correct timezone offset.
    Example for ${tripTimeZone}: 2024-03-15T14:30:00+09:00 (for Tokyo)

    Schedule Guidelines:
    1. Every activity MUST include timezone offset in times
    2. Start each day no earlier than 09:00 ${tripTimeZone}
    3. End each day no later than 22:00 ${tripTimeZone}
    4. Allow 30-45 minutes between activities for travel
    5. Schedule meals at culturally appropriate times for ${cityData.name}
    6. Use verified, existing places findable on Google Maps
    
    Trip Details:
    - Budget Level: ${preferences.budget}
    - Dietary Restrictions: ${preferences.dietary.length > 0 ? preferences.dietary.join(', ') : 'none'}
    - Travel Style: ${tripStyle}
    - Pace: ${preferences.pace > 4 ? 'Fast-paced' : preferences.pace > 2 ? 'Moderate' : 'Leisurely'}
    
    Response format:
    Output each activity as a separate, complete JSON object on a single line. Do not include any other text between activities.

    {
      "name": "string",
      "category": "string (one of: ${Object.values(ACTIVITY_CATEGORIES)
        .map(cat => cat.label)
        .join(', ')})",
      "address": "string",
      "day": number,
      "startTime": "string (ISO 8601 with timezone offset)",
      "endTime": "string (ISO 8601 with timezone offset)",
      "notes": "string"
    }
      
    Repeat this format for each activity, one activity per line, and no extra lines or text between activities.`;
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
