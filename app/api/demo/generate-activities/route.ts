// app/api/demo/generate-activities/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

import type { DemoTrip } from '@/lib/types';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  console.log(process.env.OPENAI_API_KEY);
  try {
    const trip: DemoTrip = await request.json();

    if (!trip || !trip.cityData || !trip.preferences) {
      return new NextResponse('Invalid trip data', { status: 400 });
    }

    const { cityData, preferences } = trip;
    const startDate = new Date(preferences.dates.from!);
    const endDate = new Date(preferences.dates.to!);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    console.log('Generating activities for:', {
      city: cityData.name,
      days,
      preferences: {
        dietary: preferences.dietary,
        budget: preferences.budget,
        tripVibe: preferences.tripVibe,
        pace: preferences.pace,
      },
    });

    const prompt = `Create a ${days}-day trip itinerary for ${cityData.name} with the following preferences:
      - Budget Level: ${preferences.budget}
      - Dietary Restrictions: ${preferences.dietary.length > 0 ? preferences.dietary.join(', ') : 'no specific dietary restrictions'}
      - Travel Style: ${preferences.tripVibe > 75 ? 'Adventurous' : preferences.tripVibe > 25 ? 'Balanced' : 'Relaxed'}
      - Pace: ${preferences.pace > 4 ? 'Fast-paced' : preferences.pace > 2 ? 'Moderate' : 'Leisurely'}

      Generate exactly 3 activities for the first day of the trip. For each activity, include:
      1. A descriptive name
      2. The type (choose from: DINING, SIGHTSEEING, ACCOMMODATION, TRANSPORTATION, OTHER)
      3. A real address in ${cityData.name}
      4. Latitude and longitude coordinates
      5. Start and end times (between 9 AM and 10 PM)
      6. A brief description or notes about the activity

      Format the response as this exact JSON structure:
      {
        "activities": [
          {
            "name": "activity name",
            "type": "ACTIVITY_TYPE",
            "address": "full address",
            "latitude": 00.0000,
            "longitude": 00.0000,
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
            'You are a travel planning assistant. Generate detailed, realistic travel itineraries. Respond only with valid JSON that matches the exact structure requested.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content;

    if (!response) {
      console.error('No response content from OpenAI');
      return new NextResponse('No response from OpenAI', { status: 500 });
    }

    const parsedResponse = JSON.parse(response);

    if (!parsedResponse.activities || !Array.isArray(parsedResponse.activities)) {
      console.error('Invalid response structure:', parsedResponse);
      return new NextResponse('Invalid response format from OpenAI', { status: 500 });
    }

    // Format dates for the first day of the trip
    const baseDate = startDate.toISOString().split('T')[0];

    // Map the response to our DemoActivity type
    const activities = parsedResponse.activities.map((activity: any, index: number) => {
      // Extract time from the original timestamps
      const originalStart = new Date(activity.startTime);
      const originalEnd = new Date(activity.endTime);

      // Create new timestamps using the trip's start date and original times
      const newStartTime = new Date(
        `${baseDate}T${originalStart.getHours()}:${originalStart.getMinutes()}:00Z`
      );
      const newEndTime = new Date(
        `${baseDate}T${originalEnd.getHours()}:${originalEnd.getMinutes()}:00Z`
      );

      return {
        id: `demo-${index}`,
        name: activity.name,
        type: activity.type,
        address: activity.address,
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString(),
        notes: activity.notes,
        latitude: activity.latitude,
        longitude: activity.longitude,
      };
    });

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('API Error:', error);
    return new NextResponse(error instanceof Error ? error.message : 'Internal server error', {
      status: 500,
    });
  }
}
