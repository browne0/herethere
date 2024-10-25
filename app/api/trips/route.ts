import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { tripFormSchema } from '@/lib/validations/trip';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const parsedBody = {
      ...body,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    };

    try {
      const validatedData = tripFormSchema.parse(parsedBody);

      const trip = await prisma.trip.create({
        data: {
          userId,
          title: validatedData.title,
          destination: validatedData.destination,
          startDate: validatedData.startDate,
          endDate: validatedData.endDate,
          preferences: {}, // Default empty preferences
        },
      });

      return NextResponse.json(trip);
    } catch (validationError) {
      console.error('Validation error:', validationError);
      return new NextResponse('Invalid trip data', { status: 400 });
    }
  } catch (error) {
    console.error('[TRIPS_POST]', error);
    return new NextResponse(error instanceof Error ? error.message : 'Internal Server Error', {
      status: 500,
    });
  }
}
