import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { activityService } from '@/app/api/services/activities';

export async function POST(request: Request, { params }: { params: { tripId: string } }) {
  try {
    const { userId } = await auth();
    const { tripId } = await params;
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { recommendationId } = await request.json();
    if (!recommendationId) {
      return NextResponse.json({ error: 'Recommendation ID is required' }, { status: 400 });
    }

    const activity = await activityService.scheduleActivity({
      tripId,
      userId,
      recommendationId,
    });

    return NextResponse.json({ activity });
  } catch (error) {
    console.error('[ACTIVITY_POST]', error);

    if (error instanceof Error) {
      switch (error.message) {
        case 'Trip not found':
        case 'Activity recommendation not found':
          return NextResponse.json({ error: error.message }, { status: 404 });
        case 'No suitable time slots found':
          return NextResponse.json({ error: error.message }, { status: 400 });
        default:
          return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
