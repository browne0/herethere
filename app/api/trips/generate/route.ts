import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';

import { prisma } from '@/lib/db';
import { searchPlaces } from '@/lib/places';
import type { City, TripPreferences } from '@/lib/types';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OpenAI API key');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface PlaceDetails {
  placeId: string;
  latitude: number;
  longitude: number;
  address: string;
}

// Cache for place search results
const placeCache = new Map<string, PlaceDetails>();

// Batch process place searches
async function batchFindPlaces(
  activities: any[],
  cityData: City
): Promise<Map<string, PlaceDetails>> {
  const results = new Map<string, PlaceDetails>();
  const searchPromises: Promise<void>[] = [];

  // Process in batches of 5 to avoid rate limiting
  for (let i = 0; i < activities.length; i += 5) {
    const batch = activities.slice(i, i + 5);
    const batchPromises = batch.map(async activity => {
      const cacheKey = `${activity.name}-${activity.address}`;

      // Check cache first
      if (placeCache.has(cacheKey)) {
        results.set(cacheKey, placeCache.get(cacheKey)!);
        return;
      }

      try {
        const searchResponse = await searchPlaces({
          query: `${activity.name}, ${cityData.name}`,
          locationBias: `circle:20000@${cityData.latitude},${cityData.longitude}`,
        });

        if (searchResponse.candidates?.[0]) {
          const place = searchResponse.candidates[0];
          if (place.place_id && place.geometry?.location) {
            const details: PlaceDetails = {
              placeId: place.place_id,
              latitude: place.geometry.location.lat,
              longitude: place.geometry.location.lng,
              address: place.formatted_address || `${activity.address}, ${cityData.name}`,
            };
            results.set(cacheKey, details);
            placeCache.set(cacheKey, details);
          }
        }
      } catch (error) {
        console.error('Error in place search:', error);
      }
    });

    searchPromises.push(...batchPromises);

    // Add delay between batches to respect rate limits
    if (i + 5 < activities.length) {
      searchPromises.push(new Promise(resolve => setTimeout(resolve, 200)));
    }
  }

  await Promise.all(searchPromises);
  return results;
}

// Parallel database operations
async function createActivitiesInBatch(
  activities: any[],
  tripId: string,
  startDate: Date,
  placeDetailsMap: Map<string, PlaceDetails>
) {
  const createPromises = activities.map(async (activity, index) => {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + Math.floor(index / 5)); // Assuming 5 activities per day

    const cacheKey = `${activity.name}-${activity.address}`;
    const placeDetails = placeDetailsMap.get(cacheKey);

    if (placeDetails) {
      const [hours, minutes] = activity.startTime.split(':').map(Number);
      const startTime = new Date(currentDate);
      startTime.setHours(hours, minutes, 0, 0);

      const [endHours, endMinutes] = activity.endTime.split(':').map(Number);
      const endTime = new Date(currentDate);
      endTime.setHours(endHours, endMinutes, 0, 0);

      return prisma.activity.create({
        data: {
          tripId,
          name: activity.name,
          type: activity.type,
          address: placeDetails.address,
          startTime,
          endTime,
          notes: activity.notes,
          latitude: placeDetails.latitude,
          longitude: placeDetails.longitude,
          placeId: placeDetails.placeId,
          priceLevel: activity.priceLevel,
        },
      });
    }
  });

  return Promise.all(createPromises);
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { cityData, preferences }: { cityData: City; preferences: TripPreferences } =
      await request.json();

    if (!preferences.dates?.from || !preferences.dates?.to) {
      return new NextResponse('Missing trip dates', { status: 400 });
    }

    // Start trip creation early
    const tripPromise = prisma.trip.create({
      data: {
        userId,
        title: `Trip to ${cityData.name}`,
        destination: cityData.name,
        startDate: new Date(preferences.dates.from),
        endDate: new Date(preferences.dates.to),
        preferences: preferences as any,
        placeId: preferences.city?.placeId,
        latitude: preferences.city?.latitude,
        longitude: preferences.city?.longitude,
      },
    });

    // Generate activities with OpenAI
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

    const response = JSON.parse(completion.choices[0].message.content!);

    // Flatten activities array for batch processing
    // @ts-expect-error find type later
    const allActivities = response.days.flatMap(day => day.activities);

    // Process in parallel
    const [trip, placeDetailsMap] = await Promise.all([
      tripPromise,
      batchFindPlaces(allActivities, cityData),
    ]);

    // Create activities in batch
    await createActivitiesInBatch(
      allActivities,
      trip.id,
      new Date(preferences.dates.from),
      placeDetailsMap
    );

    // Fetch final trip with activities
    const completeTrip = await prisma.trip.findUnique({
      where: { id: trip.id },
      include: { activities: true },
    });

    return NextResponse.json(completeTrip);
  } catch (error) {
    console.error('API Error:', error);
    return new NextResponse(error instanceof Error ? error.message : 'Internal server error', {
      status: 500,
    });
  }
}

// Move prompt generation to separate function
function generatePrompt(cityData: City, preferences: TripPreferences): string {
  let days = 3;

  if (preferences.dates) {
    days =
      Math.ceil(
        (new Date(preferences.dates.to!).getTime() - new Date(preferences.dates.from!).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1;
  }

  return `Create a ${days}-day trip itinerary for ${cityData.name} with the following preferences:
  - Budget Level: ${preferences.budget}
  - Dietary Restrictions: ${preferences.dietary.length > 0 ? preferences.dietary.join(', ') : 'no specific dietary restrictions'}
  - Travel Style: ${preferences.tripVibe > 75 ? 'Adventurous' : preferences.tripVibe > 25 ? 'Balanced' : 'Relaxed'}
  - Pace: ${preferences.pace > 4 ? 'Fast-paced' : preferences.pace > 2 ? 'Moderate' : 'Leisurely'}
  - Preferred Activities: ${preferences.activities?.length > 0 ? preferences.activities.join(', ') : 'all types of activities'}
  ${preferences.customInterests ? `- Special Interests: ${preferences.customInterests}` : ''}
  
  Generate 3-5 activities per day for all ${days} days of the trip. For each activity, include:
  1. A descriptive name (use the official, findable name of the place)
  2. The type (choose from: DINING, SIGHTSEEING, ACCOMMODATION, TRANSPORTATION, OTHER)
  3. The complete address as it would appear on Google Maps
  4. Start and end times (use local ${cityData.name} time, between 8:00 AM and 10:00 PM)
  5. A brief description or notes about the activity
  6. Price level (1-4, where 1=$, 2=$$, 3=$$$, 4=$$$$)

  Important guidelines:
  - Use well-known, established places that can be found on Google Maps
  - Provide complete, accurate addresses including postal codes when possible
  - Focus on popular tourist spots and highly-rated locations
  - Ensure the places actually exist and are currently operating
  - Only include places within or very near to ${cityData.name}
  - Group activities logically by location to minimize travel time
  - Include meal times at appropriate intervals
  - Account for travel time between activities
  ${preferences.customInterests ? `- Try to incorporate their specific interests: "${preferences.customInterests}"` : ''}
  
  Format the response as this exact JSON structure:
  {
    "days": [
      {
        "dayNumber": 1,
        "activities": [
          {
            "name": "activity name",
            "type": "ACTIVITY_TYPE",
            "address": "full address",
            "startTime": "09:00",
            "endTime": "11:00",
            "notes": "activity description",
            "priceLevel": 2
          }
        ]
      }
    ]
  }`;
}
