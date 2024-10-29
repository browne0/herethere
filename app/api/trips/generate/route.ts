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

async function findPlaceId(
  name: string,
  address: string,
  city: string,
  cityCoords: { latitude: number; longitude: number }
): Promise<PlaceDetails | null> {
  const searchQueries = [
    `${name}, ${address}`, // Full name and address
    `${name}, ${city}`, // Name and city
    name, // Just the name
  ];

  for (const query of searchQueries) {
    try {
      const searchResponse = await searchPlaces({
        query,
        locationBias: `circle:20000@${cityCoords.latitude},${cityCoords.longitude}`,
      });

      if (searchResponse.candidates && searchResponse.candidates.length > 0) {
        const place = searchResponse.candidates[0];
        if (!place.place_id || !place.geometry?.location) {
          continue;
        }

        return {
          placeId: place.place_id,
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          address: place.formatted_address || `${address}, ${city}`,
        };
      }
    } catch (error) {
      console.error('Error in place search attempt:', error);
      continue;
    }
  }

  return null;
}

function createTimeForDate(baseDate: Date, timeString: string): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
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

    const startDate = new Date(preferences.dates.from!);
    const endDate = new Date(preferences.dates.to!);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const prompt = `Create a ${days}-day trip itinerary for ${cityData.name} with the following preferences:
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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content:
            'You are a travel planning assistant. Generate detailed, realistic travel itineraries using real, existing places that can be found on Google Maps. Respond only with valid JSON that matches the exact structure requested.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const response = JSON.parse(completion.choices[0].message.content!);

    // Create the trip in the database
    const trip = await prisma.trip.create({
      data: {
        userId,
        title: `Trip to ${cityData.name}`,
        destination: cityData.name,
        startDate,
        endDate,
        preferences: preferences as any, // You might want to define a more specific type
      },
    });

    // Process and create activities for each day
    for (const day of response.days) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + (day.dayNumber - 1));

      for (const activity of day.activities) {
        try {
          const placeDetails = await findPlaceId(activity.name, activity.address, cityData.name, {
            latitude: cityData.latitude,
            longitude: cityData.longitude,
          });

          if (placeDetails) {
            await prisma.activity.create({
              data: {
                tripId: trip.id,
                name: activity.name,
                type: activity.type,
                address: placeDetails.address,
                startTime: createTimeForDate(currentDate, activity.startTime),
                endTime: createTimeForDate(currentDate, activity.endTime),
                notes: activity.notes,
                latitude: placeDetails.latitude,
                longitude: placeDetails.longitude,
                placeId: placeDetails.placeId,
                priceLevel: activity.priceLevel,
              },
            });
          }
        } catch (error) {
          console.error('Error processing activity:', error);
          // Continue with other activities even if one fails
        }
      }
    }

    // Fetch the complete trip with activities
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
