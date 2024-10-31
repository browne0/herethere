import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { activityFormSchema } from '@/lib/validations/activity';

export async function DELETE(
  _req: Request,
  { params }: { params: { tripId: string; activityId: string } }
) {
  try {
    const { userId } = await auth();
    const { tripId, activityId } = await params;
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Verify the activity belongs to a trip owned by the user
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        userId: userId,
        activities: {
          some: {
            id: activityId,
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
        id: activityId,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting activity:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { tripId: string; activityId: string } }
) {
  try {
    const { userId } = await auth();
    const { tripId, activityId } = await params;
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Verify the activity belongs to a trip owned by the user
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        userId: userId,
        activities: {
          some: {
            id: activityId,
          },
        },
      },
    });

    if (!trip) {
      return new NextResponse('Not found', { status: 404 });
    }

    const json = await req.json();

    // Validate the request body
    const result = activityFormSchema.safeParse({
      ...json,
      startDate: new Date(json.startTime),
      endDate: new Date(json.endTime),
      startTime: new Date(json.startTime).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      }),
      endTime: new Date(json.endTime).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      }),
    });

    if (!result.success) {
      return new NextResponse('Invalid request body', { status: 400 });
    }

    // Update the activity
    const updatedActivity = await prisma.activity.update({
      where: {
        id: activityId,
      },
      data: {
        name: json.name,
        type: json.type,
        address: json.address,
        latitude: json.latitude || null, // Add these
        longitude: json.longitude || null, // Add these
        placeId: json.placeId || null, // Add this
        startTime: new Date(json.startTime),
        endTime: new Date(json.endTime),
        notes: json.notes,
      },
    });

    return NextResponse.json(updatedActivity);
  } catch (error) {
    console.error('Error updating activity:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
