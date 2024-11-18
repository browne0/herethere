import { auth } from '@clerk/nextjs/server';
import { TripStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

import { prisma } from '@/lib/db';
import { generatePrompt } from '@/lib/trip-generation/utils';
import { ActivityGenerationRequest } from '@/lib/trip-generation-streaming/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    return new NextResponse('Trip not found', { status: 404 });
  }

  if (trip.status === TripStatus.GENERATING) {
    return new NextResponse('Trip generation already in progress', { status: 409 });
  }

  await prisma.trip.update({
    where: { id: tripId },
    data: { status: TripStatus.GENERATING },
  });

  const { city, preferences }: ActivityGenerationRequest = await req.json();
  const prompt = generatePrompt(city, preferences, trip.timeZone);

  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a travel planning assistant. Generate detailed, realistic travel itineraries using real, existing places that can be found on Google Maps. Return each activity as a complete JSON object on its own line.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      stream: true,
    });

    return new Response(
      new ReadableStream({
        async start(controller) {
          let buffer = '';

          try {
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content || '';
              buffer += content;

              const newlineIndex = buffer.indexOf('\n');
              if (newlineIndex !== -1) {
                const line = buffer.slice(0, newlineIndex);
                buffer = buffer.slice(newlineIndex + 1);

                try {
                  // Only attempt to parse if we have what looks like a complete JSON object
                  if (line.trim().startsWith('{') && line.trim().endsWith('}')) {
                    const activity = JSON.parse(line);
                    controller.enqueue(
                      new TextEncoder().encode(JSON.stringify({ activity }) + '\n')
                    );
                  }
                } catch (e) {
                  // Ignore parse errors - likely incomplete JSON
                }
              }
            }

            // Handle any remaining complete JSON in the buffer
            if (buffer.trim().startsWith('{') && buffer.trim().endsWith('}')) {
              controller.enqueue(new TextEncoder().encode(buffer + '\n'));
            }

            controller.close();
          } catch (error) {
            console.error('Stream error:', error);
            await prisma.trip.update({
              where: { id: tripId },
              data: { status: TripStatus.ERROR },
            });
            controller.error(error);
          }
        },
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      }
    );
  } catch (error) {
    console.error('Generation error:', error);
    await prisma.trip.update({
      where: { id: tripId },
      data: { status: TripStatus.ERROR },
    });
    return new NextResponse('Generation failed', { status: 500 });
  }
}
