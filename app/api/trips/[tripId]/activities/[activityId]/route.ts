import { auth } from '@clerk/nextjs/server';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { NextResponse } from 'next/server';

import { activityService } from '@/app/api/services/activities';
import { UpdateableActivityFields } from '@/lib/stores/activitiesStore';

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

    // Parse and validate the request body
    const updates: UpdateableActivityFields = await request.json();

    // Validate required fields if status is being updated
    if (
      updates.status &&
      !['interested', 'planned', 'confirmed', 'completed', 'cancelled'].includes(updates.status)
    ) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    // Validate date fields if present
    if (updates.startTime && !new Date(updates.startTime).getTime()) {
      return NextResponse.json({ error: 'Invalid startTime format' }, { status: 400 });
    }

    if (updates.endTime && !new Date(updates.endTime).getTime()) {
      return NextResponse.json({ error: 'Invalid endTime format' }, { status: 400 });
    }

    // Validate that endTime is after startTime if both are provided
    if (updates.startTime && updates.endTime) {
      const start = new Date(updates.startTime);
      const end = new Date(updates.endTime);
      if (end <= start) {
        return NextResponse.json({ error: 'endTime must be after startTime' }, { status: 400 });
      }
    }

    // Validate transitTimeFromPrevious if present
    if (
      updates.transitTimeFromPrevious !== undefined &&
      (typeof updates.transitTimeFromPrevious !== 'number' || updates.transitTimeFromPrevious < 0)
    ) {
      return NextResponse.json({ error: 'Invalid transitTimeFromPrevious' }, { status: 400 });
    }

    const activity = await activityService.updateActivity({
      tripId,
      activityId,
      userId,
      updates,
    });

    return NextResponse.json(activity);
  } catch (error) {
    console.error('[ACTIVITY_UPDATE]', error);

    if (error instanceof Error) {
      switch (error.message) {
        case 'Trip not found':
          return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
        case 'Activity not found':
          return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
        case 'Unauthorized':
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        case 'Invalid update data':
          return NextResponse.json({ error: 'Invalid update data' }, { status: 400 });
        default:
          if (error instanceof PrismaClientKnownRequestError) {
            switch (error.code) {
              case 'P2025':
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
