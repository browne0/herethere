import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { generateTripBackground } from '@/lib/trip-generation/utils';
import type { City, TripPreferences } from '@/lib/types';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OpenAI API key');
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const {
      cityData,
      preferences,
    }: {
      cityData: City;
      preferences: TripPreferences;
    } = await request.json();

    if (!preferences.dates?.from || !preferences.dates?.to) {
      return new NextResponse('Missing trip dates', { status: 400 });
    }

    // Create initial trip
    const trip = await prisma.trip.create({
      data: {
        userId,
        title: `Trip to ${cityData.name}`,
        destination: cityData.name,
        startDate: new Date(preferences.dates.from),
        endDate: new Date(preferences.dates.to),
        status: 'generating',
        progress: 0,
        attemptsCount: 1,
        lastUpdateTime: new Date(),
        preferences: preferences as any,
        placeId: cityData.placeId,
        latitude: cityData.latitude,
        longitude: cityData.longitude,
      },
    });

    // Start generation in background
    void generateTripBackground(trip.id, cityData, preferences);

    return NextResponse.json({ id: trip.id });
  } catch (error) {
    console.error('Trip generation error:', error);
    return new NextResponse(error instanceof Error ? error.message : 'Internal server error', {
      status: 500,
    });
  }
}
