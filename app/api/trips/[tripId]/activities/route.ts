import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export const GET = async (_req: Request, { params }: { params: { tripId: string } }) => {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Verify the trip exists and belongs to the user
    const trip = await prisma.trip.findFirst({
      where: {
        id: params.tripId,
        userId,
      },
      select: { id: true }, // Only select id for performance
    });

    if (!trip) {
      return new Response('Trip not found', { status: 404 });
    }

    // Fetch activities
    const activities = await prisma.activity.findMany({
      where: {
        tripId: params.tripId,
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};

export async function POST(req: Request, { params }: { params: { tripId: string } }) {
  try {
    const { userId } = await auth();
    const { tripId } = await params;
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { name, type, startTime, endTime, notes, address, latitude, longitude, placeId } = body;

    // Validate the trip belongs to the user
    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        userId: userId,
      },
    });

    if (!trip) {
      return new NextResponse('Trip not found', { status: 404 });
    }

    // Create activity with the new schema structure
    const activity = await prisma.activity.create({
      data: {
        tripId,
        name,
        type,
        address,
        latitude: latitude || null,
        longitude: longitude || null,
        placeId: placeId || null,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        notes,
      },
    });

    return NextResponse.json(activity);
  } catch (error) {
    console.error('Error creating activity:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
