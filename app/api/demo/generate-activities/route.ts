// app/api/demo/generate-activities/route.ts
import { Client, Language, PlaceInputType } from '@googlemaps/google-maps-services-js';
import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';

import { searchPlaces } from '@/lib/places';
import type { DemoTrip, DemoActivity } from '@/lib/types';

if (!process.env.OPENAI_API_KEY || !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
  throw new Error('Missing required environment variables');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const googleMapsClient = new Client({});

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
  // Create search queries from most specific to least specific
  const searchQueries = [
    `${name}, ${address}`, // Full name and address
    `${name}, ${city}`, // Name and city
    `${name}`, // Just the name
  ];

  for (const query of searchQueries) {
    try {
      const response = await searchPlaces({
        query,
        locationBias: `circle:20000@${cityCoords.latitude},${cityCoords.longitude}`,
      });

      if (response.data.candidates && response.data.candidates.length > 0) {
        const place = response.data.candidates[0];
        if (!place.place_id || !place.geometry?.location) {
          console.error('Incomplete place data received:', place);
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

  // Fallback to nearby search with just the name
  try {
    const response = await searchPlaces({
      query: name,
      locationBias: `circle:20000@${cityCoords.latitude},${cityCoords.longitude}`,
    });

    if (response.candidates && response.candidates.length > 0) {
      const place = response.candidates[0];
      return {
        placeId: place.place_id,
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        address: place.formatted_address || `${address}, ${city}`,
      };
    }
  } catch (error) {
    console.error('Error in nearby search:', error);
  }

  console.warn(`No place found for: ${name}, ${address}, ${city}`);
  return null;
}

async function getTimezoneForLocation(latitude: number, longitude: number) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/timezone/json?location=${latitude},${longitude}&timestamp=${timestamp}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch timezone');
    }

    const data = await response.json();
    if (data.status === 'OK') {
      return data.timeZoneId;
    }

    throw new Error(`Timezone API error: ${data.status}`);
  } catch (error) {
    console.error('Error fetching timezone:', error);
    return 'UTC';
  }
}

function createTimeForDate(baseDate: Date, timeString: string, _timezone: string) {
  try {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date(baseDate);
    date.setHours(hours, minutes, 0, 0);
    return date;
  } catch (error) {
    console.error('Error creating time:', error);
    return new Date(baseDate);
  }
}

export async function POST(request: Request) {
  try {
    const trip: DemoTrip = await request.json();

    if (!trip || !trip.cityData || !trip.preferences || !trip.preferences.dates.from) {
      return new NextResponse('Invalid trip data', { status: 400 });
    }

    const { cityData, preferences } = trip;
    const startDate = new Date(preferences.dates.from!);
    const endDate = new Date(preferences.dates.to!);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const timezone = await getTimezoneForLocation(cityData.latitude, cityData.longitude);

    const prompt = `Create a ${days}-day trip itinerary for ${cityData.name} with the following preferences:
  - Budget Level: ${preferences.budget}
  - Dietary Restrictions: ${preferences.dietary.length > 0 ? preferences.dietary.join(', ') : 'no specific dietary restrictions'}
  - Travel Style: ${preferences.tripVibe > 75 ? 'Adventurous' : preferences.tripVibe > 25 ? 'Balanced' : 'Relaxed'}
  - Pace: ${preferences.pace > 4 ? 'Fast-paced' : preferences.pace > 2 ? 'Moderate' : 'Leisurely'}
  - Preferred Activities: ${preferences.activities?.length > 0 ? preferences.activities.join(', ') : 'all types of activities'}
  ${preferences.customInterests ? `- Special Interests: ${preferences.customInterests}` : ''}

  Based on these preferences, prioritize activities that match their interests, especially:
  ${preferences.activities
    ?.map(activity => {
      switch (activity) {
        case 'beaches':
          return '- Beach and waterfront activities';
        case 'sightseeing':
          return '- Popular landmarks and city attractions';
        case 'outdoor':
          return '- Outdoor and nature experiences';
        case 'events':
          return '- Local events, festivals, and cultural activities';
        case 'food':
          return '- Notable restaurants and food experiences';
        case 'nightlife':
          return '- Evening entertainment and nightlife spots';
        case 'shopping':
          return '- Shopping districts and markets';
        case 'wellness':
          return '- Spa and wellness activities';
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join('\n  ')}

  Generate exactly 3 activities for the first day of the trip. For each activity, include:
  1. A descriptive name (use the official, findable name of the place)
  2. The type (choose from: DINING, SIGHTSEEING, ACCOMMODATION, TRANSPORTATION, OTHER)
  3. The complete address as it would appear on Google Maps
  4. Start and end times (use local ${cityData.name} time, between 8:00 AM and 10:00 PM)
  5. A brief description or notes about the activity

  Important guidelines:
  - Use well-known, established places that can be found on Google Maps
  - Provide complete, accurate addresses including postal codes when possible
  - Focus on popular tourist spots and highly-rated locations
  - Ensure the places actually exist and are currently operating
  - Only include places within or very near to ${cityData.name}
  ${preferences.customInterests ? `- Try to incorporate their specific interests: "${preferences.customInterests}"` : ''}

  Format the response as this exact JSON structure:
  {
    "activities": [
      {
        "name": "activity name",
        "type": "ACTIVITY_TYPE",
        "address": "full address",
        "startTime": "2024-02-27T09:00:00Z",
        "endTime": "2024-02-27T11:00:00Z",
        "notes": "activity description"
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

    const response = completion.choices[0].message.content;

    if (!response) {
      return new NextResponse('No response from OpenAI', { status: 500 });
    }

    const parsedResponse = JSON.parse(response);

    if (!parsedResponse.activities || !Array.isArray(parsedResponse.activities)) {
      return new NextResponse('Invalid response format from OpenAI', { status: 500 });
    }

    // Default times in case we need them
    const defaultTimes = [
      { start: '09:00', end: '11:00' },
      { start: '12:00', end: '14:00' },
      { start: '15:00', end: '17:00' },
    ];

    // Map the response and find placeIds
    const activities: DemoActivity[] = await Promise.all(
      parsedResponse.activities.map(async (activity: any, index: number) => {
        try {
          const placeDetails = await findPlaceId(
            activity.name,
            activity.address,
            trip.cityData.name,
            { latitude: cityData.latitude, longitude: cityData.longitude }
          );

          if (!placeDetails) {
            throw new Error('Place not found');
          }

          const startTime = createTimeForDate(startDate, defaultTimes[index].start, 'UTC');
          const endTime = createTimeForDate(startDate, defaultTimes[index].end, 'UTC');

          return {
            id: `demo-${index}`,
            name: activity.name,
            type: activity.type,
            address: placeDetails.address,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            notes: activity.notes,
            latitude: placeDetails.latitude,
            longitude: placeDetails.longitude,
            placeId: placeDetails.placeId,
          };
        } catch (error) {
          console.error('Error processing activity:', error);

          return {
            id: `demo-${index}`,
            name: activity.name,
            type: activity.type,
            address: activity.address,
            startTime: createTimeForDate(startDate, defaultTimes[index].start, 'UTC').toISOString(),
            endTime: createTimeForDate(startDate, defaultTimes[index].end, 'UTC').toISOString(),
            notes: activity.notes,
            latitude: cityData.latitude,
            longitude: cityData.longitude,
            placeId: undefined,
          };
        }
      })
    );

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('API Error:', error);
    return new NextResponse(error instanceof Error ? error.message : 'Internal server error', {
      status: 500,
    });
  }
}
