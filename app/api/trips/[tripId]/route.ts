import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: { tripId: string } }) {
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
      include: {
        activities: true,
      },
    });

    return NextResponse.json(trip);
  } catch (error) {
    console.error('[TRIP_GET]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

interface RouteParams {
  params: Promise<{
    tripId: string;
  }>;
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    const { tripId } = await params;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Verify the trip belongs to the user
    const trip = await prisma.trip.findUnique({
      where: {
        id: tripId,
        userId,
      },
    });

    if (!trip) {
      return new NextResponse('Trip not found', { status: 404 });
    }

    // Delete all activities first (if not using cascade)
    await prisma.activity.deleteMany({
      where: {
        tripId,
      },
    });

    // Then delete the trip
    await prisma.trip.delete({
      where: {
        id: tripId,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[TRIP_DELETE]', error);
    return new NextResponse(error instanceof Error ? error.message : 'Internal Error', {
      status: 500,
    });
  }
}

export async function PATCH(req: Request, { params }: { params: { tripId: string } }) {
  try {
    const { userId } = await auth();
    const { tripId } = await params;
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { title, destination, startDate, endDate } = body;

    // Verify the trip belongs to the user
    const trip = await prisma.trip.findUnique({
      where: {
        id: tripId,
        userId,
      },
    });

    if (!trip) {
      return new NextResponse('Not found', { status: 404 });
    }

    // Update the trip
    const updatedTrip = await prisma.trip.update({
      where: {
        id: tripId,
      },
      data: {
        title,
        destination,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });

    return NextResponse.json(updatedTrip);
  } catch (error) {
    console.error('Error updating trip:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
