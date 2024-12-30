import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { activityService } from '@/app/api/services/activities';

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

    const results = await activityService.rebalanceSchedule(tripId, userId);
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error rebalancing schedule:', error);
    return new NextResponse(`Error rebalancing schedule: ${(error as Error).message}`, {
      status: 500,
    });
  }
}
