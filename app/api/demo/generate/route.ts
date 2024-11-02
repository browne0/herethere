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
    `${name}`, // Just the name
  ];

  for (const query of searchQueries) {
    try {
      console.log('Trying search query:', query);

      const searchResponse = await searchPlaces({
        query,
        locationBias: `circle:20000@${cityCoords.latitude},${cityCoords.longitude}`,
      });

      console.log('Place search response:', searchResponse);

      if (searchResponse.candidates && searchResponse.candidates.length > 0) {
        const place = searchResponse.candidates[0];
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

  // Fallback to a broader search
  try {
    const searchResponse = await searchPlaces({
      query: name,
      locationBias: `circle:20000@${cityCoords.latitude},${cityCoords.longitude}`,
    });

    console.log('Broader place search response:', searchResponse);

    if (searchResponse.candidates && searchResponse.candidates.length > 0) {
      const place = searchResponse.candidates[0];
      return {
        placeId: place.place_id,
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        address: place.formatted_address || `${address}, ${city}`,
      };
    }
  } catch (error) {
    console.error('Error in broader place search:', error);
  }

  console.warn(`No place found for: ${name}, ${address}, ${city}`);
  return null;
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
    const { cityData, preferences } = trip;

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
    6. Price level (1-4, where 1=$, 2=$$, 3=$$$, 4=$$$$)
  
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
          "notes": "activity description",
          "priceLevel": 2
        }
      ]
    }`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are a travel planning assistant. Generate detailed, realistic travel itineraries using real, existing places that can be found on Google Maps. Respond only with valid JSON that matches the exact structure requested.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const response = completion.choices[0].message.content!;

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
      parsedResponse.activities.map(async (activity: DemoActivity, index: number) => {
        try {
          const placeDetails = await findPlaceId(activity.name, activity.address, cityData.name, {
            latitude: cityData.latitude,
            longitude: cityData.longitude,
          });

          console.log(placeDetails);

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
            priceLevel: activity.priceLevel,
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
            priceLevel: undefined,
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
