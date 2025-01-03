import { auth } from '@clerk/nextjs/server';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { NextResponse } from 'next/server';

import { activityService } from '@/app/api/services/activities';

export async function DELETE(
  _request: Request,
  { params }: { params: { tripId: string; activityId: string } }
) {
  try {
    const { userId } = await auth();
    const { tripId, activityId } = await params;
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    await activityService.deleteActivity({
      tripId,
      activityId,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[ACTIVITY_DELETE]', error);

    if (error instanceof Error) {
      switch (error.message) {
        case 'Trip not found':
          return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
        case 'Activity not found in trip':
          return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
        default:
          if (error instanceof PrismaClientKnownRequestError) {
            switch (error.code) {
              case 'P2025': // Record not found
                return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
              default:
                return NextResponse.json({ error: 'Database operation failed' }, { status: 400 });
            }
          }
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { tripId: string; activityId: string } }
) {
  try {
    const { userId } = await auth();
    const { tripId, activityId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status } = await request.json();

    const activity = await activityService.updateActivity({
      tripId,
      activityId,
      userId,
      status,
    });

    return NextResponse.json({ activity });
  } catch (error) {
    console.error('Error in PATCH /api/trips/[tripId]/activities/[activityId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
