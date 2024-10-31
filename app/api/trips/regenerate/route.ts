// app/api/trips/[tripId]/regenerate/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { handleGenerationError, MAX_RETRY_ATTEMPTS } from '@/lib/trip-generation/utils';
import { generateTripBackground } from '@/lib/trip-generation/utils';
import type { TripPreferences } from '@/lib/types';

export async function POST(_request: Request, { params }: { params: { tripId: string } }) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { tripId } = params;

  try {
    // Check retry attempts
    const trip = await prisma.trip.findUnique({
      where: { id: tripId, userId },
      select: {
        id: true,
        attemptsCount: true,
        preferences: true,
      },
    });

    if (!trip) {
      return new NextResponse('Trip not found', { status: 404 });
    }

    // Handle missing or invalid data
    if (!trip.preferences) {
      await handleGenerationError(tripId, 'INVALID_PREFERENCES', 'Trip preferences not found');
      return new NextResponse(JSON.stringify({ error: 'Invalid trip data' }), { status: 400 });
    }

    const preferences = trip.preferences as unknown as TripPreferences;
    if (!preferences.city) {
      await handleGenerationError(
        tripId,
        'INVALID_PREFERENCES',
        'City data not found in preferences'
      );
      return new NextResponse(JSON.stringify({ error: 'Invalid city data' }), { status: 400 });
    }

    const attemptsCount = trip.attemptsCount ?? 0;
    if (attemptsCount >= MAX_RETRY_ATTEMPTS) {
      await handleGenerationError(
        tripId,
        'TIMEOUT_ERROR',
        'Maximum retry attempts reached. Please create a new trip.'
      );

      return new NextResponse(JSON.stringify({ error: 'Maximum retry attempts reached' }), {
        status: 400,
      });
    }

    // Reset trip state for retry
    await prisma.trip.update({
      where: { id: tripId },
      data: {
        status: 'generating',
        progress: 0,
        errorCode: null,
        errorMessage: null,
        attemptsCount: {
          increment: 1,
        },
        lastUpdateTime: new Date(),
      },
    });

    // Delete existing activities
    await prisma.activity.deleteMany({
      where: { tripId },
    });

    // Start regeneration in background
    void generateTripBackground(tripId, preferences.city, preferences);

    return NextResponse.json({ status: 'regenerating' });
  } catch (error) {
    console.error('Regeneration error:', error);
    await handleGenerationError(tripId, 'UNKNOWN_ERROR', 'An unexpected error occurred');
    return new NextResponse('Internal server error', { status: 500 });
  }
}
