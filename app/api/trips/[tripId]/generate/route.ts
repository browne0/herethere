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

class StringBuilder {
  private buffer: string = '';

  append(str: string): this {
    this.buffer += str;
    return this;
  }

  toString(): string {
    return this.buffer;
  }

  clear(): this {
    this.buffer = '';
    return this;
  }
}

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
          content: `You are a travel planning assistant. Generate realistic travel itineraries using real, existing places that can be found on Google Maps.`,
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
          const buffer = new StringBuilder();
          const processedActivities = new Set<string>();

          try {
            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content || '';
              buffer.append(content);

              // Process complete lines
              const lines = buffer.toString().split('\n');
              // Keep last line in buffer as it may be incomplete
              buffer.clear().append(lines.pop() || '');

              for (const line of lines) {
                if (!line.trim()) continue;

                try {
                  const activity = JSON.parse(line);
                  const key = `${activity.day}-${activity.startTime}-${activity.name}`;

                  if (!processedActivities.has(key)) {
                    processedActivities.add(key);
                    controller.enqueue(
                      new TextEncoder().encode(JSON.stringify({ activity }) + '\n')
                    );
                  }
                } catch (e) {
                  console.error('Failed to parse activity:', e);
                }
              }
            }

            // Process any remaining content
            const remaining = buffer.toString().trim();
            if (remaining) {
              try {
                const activity = JSON.parse(remaining);
                const key = `${activity.day}-${activity.startTime}-${activity.name}`;

                if (!processedActivities.has(key)) {
                  controller.enqueue(new TextEncoder().encode(JSON.stringify({ activity }) + '\n'));
                }
              } catch (e) {
                console.error('Failed to parse final activity:', e);
              }
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
