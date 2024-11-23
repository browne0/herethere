import { auth } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: { tripId: string } }) {
  try {
    const { userId } = await auth();
    const { tripId } = await params;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const trip = await prisma.trip.findUnique({
      where: {
        id: tripId,
        userId,
      },
      include: {
        activities: true,
      },
    });

    return NextResponse.json(trip);
  } catch (error) {
    console.error('[TRIP_GET]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

interface RouteParams {
  params: Promise<{
    tripId: string;
  }>;
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    // Auth check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tripId } = await params;

    // Verify the trip exists and belongs to the user
    const trip = await prisma.trip.findUnique({
      where: {
        id: tripId,
        userId, // Ensure it belongs to the user
      },
      include: {
        _count: {
          select: {
            activities: true,
          },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Use a transaction to ensure all related data is deleted
    const result = await prisma.$transaction(async tx => {
      // Delete all itinerary activities first
      await tx.itineraryActivity.deleteMany({
        where: { tripId },
      });

      // Delete the trip
      const deletedTrip = await tx.trip.delete({
        where: { id: tripId },
        include: {
          _count: {
            select: {
              activities: true,
            },
          },
        },
      });

      return deletedTrip;
    });

    return NextResponse.json(
      {
        message: 'Trip deleted successfully',
        data: {
          tripId: result.id,
          destination: result.destination,
          activitiesRemoved: result._count.activities,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[TRIP_DELETE]', error);

    if (error instanceof PrismaClientKnownRequestError) {
      // Handle specific Prisma errors
      switch (error.code) {
        case 'P2025': // Record not found
          return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
        case 'P2003': // Foreign key constraint failed
          return NextResponse.json(
            { error: 'Failed to delete related activities' },
            { status: 400 }
          );
        default:
          return NextResponse.json({ error: 'Database operation failed' }, { status: 400 });
      }
    }

    // Generic error
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// export async function PATCH(req: Request, { params }: { params: { tripId: string } }) {
//   try {
//     const { userId } = await auth();
//     const { tripId } = await params;
//     if (!userId) {
//       return new NextResponse('Unauthorized', { status: 401 });
//     }

//     const body = await req.json();

//     // Verify the trip belongs to the user
//     const trip = await prisma.trip.findUnique({
//       where: {
//         id: tripId,
//         userId,
//       },
//     });

//     if (!trip) {
//       return new NextResponse('Not found', { status: 404 });
//     }

//     // Build update data object only with provided fields
//     const updateData: Prisma.TripUpdateInput = {};

//     if (body.status !== undefined) {
//       updateData.status = body.status;
//     }

//     if (body.title !== undefined) {
//       updateData.title = body.title;
//     }

//     if (body.destination !== undefined) {
//       updateData.destination = body.destination;
//     }

//     if (body.startDate !== undefined) {
//       updateData.startDate = new Date(body.startDate);
//     }

//     if (body.endDate !== undefined) {
//       updateData.endDate = new Date(body.endDate);
//     }

//     if (body.cityBounds !== undefined) {
//       updateData.cityBounds = body.cityBounds;
//     }

//     // Update the trip with only the provided fields
//     const updatedTrip = await prisma.trip.update({
//       where: {
//         id: tripId,
//       },
//       data: updateData,
//     });

//     return NextResponse.json(updatedTrip);
//   } catch (error) {
//     console.error('Error updating trip:', error);
//     return new NextResponse('Internal error', { status: 500 });
//   }
// }
