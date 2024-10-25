import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export async function GET(req: Request, { params }: { params: { tripId: string } }) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const trip = await prisma.trip.findUnique({
      where: {
        id: params.tripId,
        userId,
      },
    });

    return NextResponse.json(trip);
  } catch (error) {
    console.error('[TRIP_GET]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { tripId: string } }) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Verify the trip belongs to the user
    const trip = await prisma.trip.findUnique({
      where: {
        id: params.tripId,
        userId,
      },
    });

    if (!trip) {
      return new NextResponse('Trip not found', { status: 404 });
    }

    // Delete the trip and all related activities (cascade delete is set up in schema)
    await prisma.trip.delete({
      where: {
        id: params.tripId,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[TRIP_DELETE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
