import { auth } from '@clerk/nextjs/server';
import { Client, TravelMode } from '@googlemaps/google-maps-services-js';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

const googleMapsClient = new Client({});

interface RouteSegment {
  distance: string;
  duration: string;
  startActivity: {
    id: string;
    name: string;
    type: string;
    startTime: string;
    endTime: string;
  };
  endActivity: {
    id: string;
    name: string;
    type: string;
    startTime: string;
    endTime: string;
  };
}

export async function GET(_request: Request, { params }: { params: { tripId: string } }) {
  try {
    const { tripId } = params;

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
        north: Math.max(...tripData.activities.map(a => a.latitude as number)),
        south: Math.min(...tripData.activities.map(a => a.latitude as number)),
        east: Math.max(...tripData.activities.map(a => a.longitude as number)),
        west: Math.min(...tripData.activities.map(a => a.longitude as number)),
      };

      // Add some padding to the bounds (about 10%)
      const latPadding = (bounds.north - bounds.south) * 0.1;
      const lngPadding = (bounds.east - bounds.west) * 0.1;
      bounds.north += latPadding;
      bounds.south -= latPadding;
      bounds.east += lngPadding;
      bounds.west -= lngPadding;
    }

    // Calculate route segments
    const routeSegments: RouteSegment[] = [];

    if (tripData.activities.length > 1) {
      for (let i = 0; i < tripData.activities.length - 1; i++) {
        const startActivity = tripData.activities[i];
        const endActivity = tripData.activities[i + 1];

        try {
          // Get route details from Google Maps Directions API
          const response = await googleMapsClient.directions({
            params: {
              origin: `${startActivity.latitude},${startActivity.longitude}`,
              destination: `${endActivity.latitude},${endActivity.longitude}`,
              mode: TravelMode.driving,
              key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
            },
          });

          if (response.data.routes[0]?.legs[0]) {
            const leg = response.data.routes[0].legs[0];
            routeSegments.push({
              distance: leg.distance?.text || 'Unknown distance',
              duration: leg.duration?.text || 'Unknown duration',
              startActivity: {
                id: startActivity.id,
                name: startActivity.name,
                type: startActivity.type,
                startTime: startActivity.startTime.toISOString(),
                endTime: startActivity.endTime.toISOString(),
              },
              endActivity: {
                id: endActivity.id,
                name: endActivity.name,
                type: endActivity.type,
                startTime: endActivity.startTime.toISOString(),
                endTime: endActivity.endTime.toISOString(),
              },
            });
          }
        } catch (error) {
          console.error('Error calculating route segment:', error);
          // Continue with next segment if one fails
          continue;
        }
      }
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
      routeSegments,
    });
  } catch (error) {
    console.error('Error fetching trip map data:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
