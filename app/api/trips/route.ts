import { auth } from '@clerk/nextjs/server';
import { Client } from '@googlemaps/google-maps-services-js';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { prisma } from '@/lib/db';
import { isCityBounds } from '@/lib/types';
import { tripFormSchema } from '@/lib/validations/trip';

const googleMapsClient = new Client({});

async function getTimeZone(latitude: number, longitude: number): Promise<string> {
  try {
    const timestamp = Math.floor(Date.now() / 1000);

    const response = await googleMapsClient.timezone({
      params: {
        location: { lat: latitude, lng: longitude },
        timestamp,
        key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      },
    });

    if (response.data.timeZoneId) {
      return response.data.timeZoneId; // Returns strings like "Asia/Tokyo"
    }

    throw new Error('Timezone not found');
  } catch (error) {
    console.error('Failed to get timezone:', error);
    // Fallback to UTC if we can't get the timezone
    return 'UTC';
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();

    if (body.cityBounds && !isCityBounds(body.cityBounds)) {
      return new NextResponse(JSON.stringify({ message: 'Invalid city bounds format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const timeZone = await getTimeZone(body.latitude, body.longitude);

    const parsedBody = {
      ...body,
      timeZone,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    };

    try {
      const validatedData = tripFormSchema.parse(parsedBody);

      // Create the trip data with userId included
      const tripData = {
        ...validatedData,
        userId,
        preferences: body.preferences || {}, // Default empty preferences
      };

      const trip = await prisma.trip.create({
        data: tripData,
      });

      return NextResponse.json({
        message: 'Trip created successfully',
        trip,
      });
    } catch (validationError) {
      console.error('Validation error:', validationError);

      if (validationError instanceof ZodError) {
        return new NextResponse(
          JSON.stringify({
            message: 'Validation failed',
            errors: validationError.errors.map(error => ({
              path: error.path.join('.'),
              message: error.message,
            })),
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      return new NextResponse(JSON.stringify({ message: 'Invalid trip data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('[TRIPS_POST]', error);

    return new NextResponse(
      JSON.stringify({
        message: error instanceof Error ? error.message : 'Internal Server Error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
