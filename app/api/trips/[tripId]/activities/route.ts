import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { activityFormSchema } from '@/lib/validations/activity';

export async function POST(req: Request, { params }: { params: { tripId: string } }) {
  try {
    const { userId } = await auth();
    const { tripId } = await params;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const trip = await prisma.trip.findUnique({
      where: {
        id: tripId,
        userId,
      },
    });

    if (!trip) {
      return new NextResponse('Trip not found', { status: 404 });
    }

    const body = await req.json();
    const validatedData = activityFormSchema.parse(body);

    const activity = await prisma.activity.create({
      data: {
        tripId,
        name: validatedData.name,
        type: validatedData.type,
        location: validatedData.location,
        startTime: new Date(validatedData.startTime),
        endTime: new Date(validatedData.endTime),
        notes: validatedData.notes,
      },
    });

    return NextResponse.json(activity);
  } catch (error) {
    console.error('[ACTIVITY_POST]', error);
    if (error instanceof Error) {
      return new NextResponse(error.message, { status: 400 });
    }
    return new NextResponse('Internal Error', { status: 500 });
  }
}
