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
          content: `You are a travel planning assistant. Generate detailed, realistic travel itineraries using real, existing places that can be found on Google Maps. Respond only with valid JSON that matches the exact structure requested.`,
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
          const processedActivities = new Set<string>();
          let isControllerClosed = false; // Track if the controller is already closed

          const safeEnqueue = (data: string) => {
            if (!isControllerClosed) {
              try {
                controller.enqueue(new TextEncoder().encode(data + '\n'));
              } catch (e) {
                console.error('Error during enqueue:', e);
              }
            }
          };

          const safeClose = () => {
            if (!isControllerClosed) {
              try {
                controller.close();
                isControllerClosed = true;
              } catch (e) {
                console.error('Error during close:', e);
              }
            }
          };

          try {
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content || '';
              buffer += content;

              while (true) {
                const openBracket = buffer.indexOf('{');
                const closeBracket = buffer.indexOf('}', openBracket);

                if (openBracket === -1 || closeBracket === -1) break;

                const possibleJson = buffer.slice(openBracket, closeBracket + 1);
                buffer = buffer.slice(closeBracket + 1);

                try {
                  const activity = JSON.parse(possibleJson);
                  const key = `${activity.dayNumber}-${activity.startTime}-${activity.name}`;

                  if (!processedActivities.has(key)) {
                    processedActivities.add(key);
                    safeEnqueue(JSON.stringify({ activity }));
                  }
                } catch (e) {
                  console.error('Failed to parse activity:', e, 'Content:', possibleJson);
                }
              }
            }

            // Process remaining buffer
            if (buffer.trim()) {
              try {
                const activity = JSON.parse(buffer);
                const key = `${activity.dayNumber}-${activity.startTime}-${activity.name}`;

                if (!processedActivities.has(key)) {
                  processedActivities.add(key);
                  safeEnqueue(JSON.stringify({ activity }));
                }
              } catch (e) {
                console.error('Failed to parse final activity:', e, 'Remaining Content:', buffer);
              }
            }

            safeClose(); // Close the controller safely
          } catch (error) {
            console.error('Stream processing error:', error);
            await prisma.trip.update({
              where: { id: tripId },
              data: { status: TripStatus.ERROR },
            });
            controller.error(error); // Signal an error state
            safeClose(); // Ensure the controller is closed
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
