import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { activityService } from '@/app/api/services/activities';

export async function POST(request: Request, { params }: { params: { tripId: string } }) {
  try {
    const { userId } = await auth();
    const { tripId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recommendationId, status } = await request.json();

    const activity = await activityService.createActivity({
      tripId,
      userId,
      recommendationId,
      status,
    });

    return NextResponse.json({ activity });
  } catch (error) {
    console.error('Error in POST /api/trips/[tripId]/activities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
