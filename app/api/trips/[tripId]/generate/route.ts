import { openai } from '@ai-sdk/openai';
import { auth } from '@clerk/nextjs/server';
import { TripStatus } from '@prisma/client';
import { streamObject } from 'ai';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { generatePrompt, generateTripBackground } from '@/lib/trip-generation/utils';
import { activitiesSchema, ActivityGenerationRequest } from '@/lib/trip-generation-streaming/types';

export async function POST(req: Request, { params }: { params: { tripId: string } }) {
  const { userId } = await auth();
  const { tripId } = await params;

  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, userId },
  });

  if (!trip) {
    return new Response('Trip not found', { status: 404 });
  }

  if (trip.status === TripStatus.GENERATING) {
    return new Response('Trip generation already in progress', { status: 409 });
  }

  // Update status to generating immediately
  await prisma.trip.update({
    where: { id: tripId },
    data: { status: TripStatus.GENERATING },
  });

  const { city, preferences }: ActivityGenerationRequest = await req.json();
  const prompt = generatePrompt(city, preferences);

  try {
    const result = await streamObject({
      model: openai('gpt-4-turbo'),
      schema: activitiesSchema,
      system:
        'You are a travel planning assistant. Generate detailed, realistic travel itineraries using real, existing places that can be found on Google Maps. Respond only with valid JSON that matches the exact structure requested.',
      prompt,
      onFinish: async result => {
        try {
          await generateTripBackground(result.object!.activities, trip, city);
        } catch (error) {
          console.error('Background generation error:', error);
          await prisma.trip.update({
            where: { id: tripId },
            data: { status: TripStatus.ERROR },
          });
        }
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Stream generation error:', error);
    await prisma.trip.update({
      where: { id: tripId },
      data: { status: TripStatus.ERROR },
    });
    return new Response('Generation failed', { status: 500 });
  }
}
