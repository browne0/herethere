import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export async function DELETE(
  req: Request,
  { params }: { params: { tripId: string; activityId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Verify the activity belongs to a trip owned by the user
    const trip = await prisma.trip.findFirst({
      where: {
        id: params.tripId,
        userId: userId,
        activities: {
          some: {
            id: params.activityId,
          },
        },
      },
    });

    if (!trip) {
      return new NextResponse('Not found', { status: 404 });
    }

    // Delete the activity
    await prisma.activity.delete({
      where: {
        id: params.activityId,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting activity:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
