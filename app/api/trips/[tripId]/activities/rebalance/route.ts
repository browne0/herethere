import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { activityService } from '@/app/api/services/activities';
import { clearSchedulingData } from '@/app/api/services/utils2';
import { ParsedItineraryActivity } from '@/app/trips/[tripId]/types';
import { prisma } from '@/lib/db';

async function updateScheduledActivities(activities: ParsedItineraryActivity[]) {
  const updates = activities.map(activity =>
    prisma.itineraryActivity.update({
      where: { id: activity.id },
      data: {
        startTime: activity.startTime,
        endTime: activity.endTime,
        transitTimeFromPrevious: activity.transitTimeFromPrevious,
        warning: activity.warning,
      },
    })
  );

  await Promise.all(updates);
}

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

    const trip = await prisma.trip.findUnique({
      where: { id: tripId, userId },
      include: {
        city: true,
        activities: {
          include: {
            recommendation: true,
          },
        },
      },
    });

    if (!trip) {
      return new NextResponse('Trip not found', { status: 404 });
    }

    await clearSchedulingData(tripId);

    // Perform the rebalancing operation
    const results = await activityService.rebalanceSchedule(tripId, userId);

    // Update activities in database
    await updateScheduledActivities([...results.scheduled, ...results.unscheduled]);

    // Update trip last rebalanced timestamp
    await prisma.trip.update({
      where: { id: tripId },
      data: { lastRebalanced: new Date() },
    });

    return NextResponse.json({
      trip: {
        ...trip,
        activities: [...results.scheduled, ...results.unscheduled],
      },
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
