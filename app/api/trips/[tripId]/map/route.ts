import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export async function GET(request: Request, { params }: { params: { tripId: string } }) {
  try {
    const { tripId } = await params;

    // Get authenticated user
    const { userId } = await auth();

    // If no authenticated user, check if trip is public
    if (!userId) {
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        select: { isPublic: true },
      });

      if (!trip?.isPublic) {
        return new NextResponse('Unauthorized', { status: 401 });
      }
    }

    // Fetch trip and its activities
    const tripData = await prisma.trip.findFirst({
      where: {
        id: tripId,
        OR: [
          { userId: userId ?? undefined },
          { isPublic: true },
          {
            sharedWith: {
              some: {
                userId: userId ?? undefined,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        destination: true,
        startDate: true,
        endDate: true,
        activities: {
          orderBy: {
            startTime: 'asc',
          },
          select: {
            id: true,
            type: true,
            name: true,
            address: true,
            latitude: true,
            longitude: true,
            startTime: true,
            endTime: true,
            placeId: true,
            notes: true,
          },
        },
      },
    });

    if (!tripData) {
      return new NextResponse('Trip not found', { status: 404 });
    }

    // Calculate map bounds
    let bounds: { north: number; south: number; east: number; west: number } | null = null;

    if (tripData.activities.length > 0) {
      bounds = {
        north: Math.max(...tripData.activities.map(a => a.latitude)),
        south: Math.min(...tripData.activities.map(a => a.latitude)),
        east: Math.max(...tripData.activities.map(a => a.longitude)),
        west: Math.min(...tripData.activities.map(a => a.longitude)),
      };

      // Add some padding to the bounds (about 10%)
      const latPadding = (bounds.north - bounds.south) * 0.1;
      const lngPadding = (bounds.east - bounds.west) * 0.1;
      bounds.north += latPadding;
      bounds.south -= latPadding;
      bounds.east += lngPadding;
      bounds.west -= lngPadding;
    }

    return NextResponse.json({
      trip: {
        id: tripData.id,
        title: tripData.title,
        destination: tripData.destination,
        startDate: tripData.startDate,
        endDate: tripData.endDate,
        bounds,
      },
      activities: tripData.activities,
    });
  } catch (error) {
    console.error('Error fetching trip map data:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
