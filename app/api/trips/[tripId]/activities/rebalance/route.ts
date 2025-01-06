import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { activityService } from '@/app/api/services/activities';
import { prisma } from '@/lib/db';

export async function POST(_request: Request, { params }: { params: { tripId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { tripId } = await params;
    if (!tripId) {
      return new NextResponse('Trip ID is required', { status: 400 });
    }

    // Perform the rebalancing operation
    const results = await activityService.rebalanceSchedule(tripId, userId);

    await prisma.trip.update({
      where: { id: tripId },
      data: { lastRebalanced: new Date() },
    });

    const updatedTrip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        city: true,
        activities: {
          include: {
            recommendation: true,
          },
        },
      },
    });

    if (!updatedTrip) {
      return new NextResponse('Trip not found', { status: 404 });
    }

    return NextResponse.json({
      trip: updatedTrip,
      rebalanceResults: {
        unscheduledCount: results.unscheduled.length,
      },
    });
  } catch (error) {
    console.error('Error rebalancing schedule:', error);
    return new NextResponse(`Error rebalancing schedule: ${(error as Error).message}`, {
      status: 500,
    });
  }
}
