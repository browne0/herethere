import OpenAI from 'openai';

import { prisma } from '@/lib/db';

import type { ErrorCode, GeneratedActivity, GeneratedTrip, PlaceDetails } from './types';
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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function handleGenerationError(tripId: string, code: ErrorCode, message: string) {
  await prisma.trip.update({
    where: { id: tripId },
    data: {
      status: 'error',
      progress: 0,
      errorCode: code,
      errorMessage: message,
      lastUpdateTime: new Date(),
    },
  });
}

async function processBatch(
  activities: GeneratedActivity[],
  tripId: string,
  startDate: Date,
  batchSize = 3
): Promise<void> {
  for (let i = 0; i < activities.length; i += batchSize) {
    const batch = activities.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (activity, index) => {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + Math.floor((i + index) / 5));

        const [startHours, startMinutes] = activity.startTime.split(':').map(Number);
        const startTime = new Date(currentDate);
        startTime.setHours(startHours, startMinutes, 0, 0);

        const [endHours, endMinutes] = activity.endTime.split(':').map(Number);
        const endTime = new Date(currentDate);
        endTime.setHours(endHours, endMinutes, 0, 0);

        await prisma.activity.create({
          data: {
            tripId,
            name: activity.name,
            type: activity.type,
            startTime,
            endTime,
            notes: activity.notes,
            status: 'pending',
          },
        });
      })
    );

    await prisma.trip.update({
      where: { id: tripId },
      data: {
        progress: Math.min(30 + Math.floor((i / activities.length) * 40), 70),
      },
    });

    if (i + batchSize < activities.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

export async function generateTripBackground(
  tripId: string,
  cityData: City,
  preferences: TripPreferences
): Promise<void> {
  try {
    await prisma.trip.update({
      where: { id: tripId },
      data: { progress: 10 },
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content:
            'You are a travel planning assistant. Generate detailed, realistic travel itineraries using real, existing places that can be found on Google Maps. Respond only with valid JSON that matches the exact structure requested.',
        },
        {
          role: 'user',
          content: generatePrompt(cityData, preferences),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const response = JSON.parse(completion.choices[0].message.content!) as GeneratedTrip;

    await prisma.trip.update({
      where: { id: tripId },
      data: {
        progress: 30,
        status: 'basic_ready',
      },
    });

    const allActivities = response.days.flatMap(day => day.activities);

    if (!preferences.dates?.from) {
      throw new Error('Missing start date');
    }

    await processBatch(allActivities, tripId, new Date(preferences.dates.from));

    void enhancePlacesBackground(tripId, cityData);
  } catch (error) {
    console.error('Background generation error:', error);
    await prisma.trip.update({
      where: { id: tripId },
      data: {
        status: 'error',
        progress: 0,
      },
    });
  }
}

async function enhancePlacesBackground(tripId: string, cityData: City) {
  try {
    const activities = await prisma.activity.findMany({
      where: { tripId, status: 'pending' },
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
              status: 'complete',
            },
          });
        }

        await prisma.trip.update({
          where: { id: tripId },
          data: {
            progress: 70 + Math.floor((i / activities.length) * 30),
          },
        });
      } catch (error) {
        console.error(`Error enhancing activity ${activity.id}:`, error);
      }
    }

    await prisma.trip.update({
      where: { id: tripId },
      data: {
        status: 'complete',
        progress: 100,
      },
    });
  } catch (error) {
    console.error('Place enhancement error:', error);
    await prisma.trip.update({
      where: { id: tripId },
      data: {
        status: 'error',
        progress: 0,
      },
    });
  }
}

function generatePrompt(cityData: City, preferences: TripPreferences): string {
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

  const pace =
    preferences.pace > 4 ? 'Fast-paced' : preferences.pace > 2 ? 'Moderate' : 'Leisurely';

  return `Create a ${days}-day trip itinerary for ${cityData.name} with the following preferences:
  - Budget Level: ${preferences.budget}
  - Dietary Restrictions: ${preferences.dietary.length > 0 ? preferences.dietary.join(', ') : 'none'}
  - Travel Style: ${tripStyle}
  - Pace: ${pace}
  - Walking Comfort: ${preferences.walkingComfort || 'moderate'}
  - Activities: ${preferences.activities?.length > 0 ? preferences.activities.join(', ') : 'all types'}
  ${preferences.customInterests ? `- Special Interests: ${preferences.customInterests}` : ''}
  
  Generate ${tripStyle === 'Adventurous' ? '4-5' : tripStyle === 'Balanced' ? '3-4' : '2-3'} activities per day for all ${days} days.
  
  For each activity, include:
  1. Name (use official, findable place names)
  2. Type (DINING, SIGHTSEEING, ACTIVITY, TRANSPORTATION)
  3. Complete address as it appears on Google Maps
  4. Start and end times (between 8:00-22:00 ${cityData.name} time)
  5. Brief description/notes
  6. Price level (1-4)

  Important:
  - Use verified, existing places findable on Google Maps
  - Include complete addresses
  - Focus on well-reviewed tourist spots
  - Group activities by location to minimize travel
  - Account for ${preferences.walkingComfort || 'moderate'} walking preference
  - Include meal times at logical intervals
  ${preferences.dietary.length > 0 ? `- Ensure dining spots accommodate: ${preferences.dietary.join(', ')}` : ''}
  
  Response format:
  {
    "days": [
      {
        "dayNumber": 1,
        "activities": [
          {
            "name": "string",
            "type": "string",
            "address": "string",
            "startTime": "HH:MM",
            "endTime": "HH:MM",
            "notes": "string",
            "priceLevel": number
          }
        ]
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
