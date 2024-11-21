import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export async function DELETE(
  request: Request,
  { params }: { params: { tripId: string; activityId: string } }
) {
  try {
    const { userId } = await auth();
    const { tripId, activityId } = await params;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Verify trip ownership
    const trip = await prisma.trip.findUnique({
      where: {
        id: tripId,
        userId,
      },
    });

    if (!trip) {
      return new NextResponse('Trip not found', { status: 404 });
    }

    // Delete the activity
    await prisma.itineraryActivity.delete({
      where: {
        id: activityId,
        tripId: tripId,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting activity:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
