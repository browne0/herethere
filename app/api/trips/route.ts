import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { prisma } from '@/lib/db';
import { isCityBounds } from '@/lib/types';
import { tripFormSchema } from '@/lib/validations/trip';

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

    const parsedBody = {
      ...body,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    };

    try {
      const validatedData = tripFormSchema.parse(parsedBody);

      // Create the trip data with userId included
      const tripData = {
        ...validatedData,
        userId, // Add the userId here
        preferences: {}, // Default empty preferences
      };

      console.log('Creating trip with data:', tripData);

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
