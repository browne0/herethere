import { auth } from '@clerk/nextjs/server';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { NextRequest, NextResponse } from 'next/server';

import { tripService } from '@/app/api/services/trips';

export async function GET(request: NextRequest, { params }: { params: { tripId: string } }) {
  try {
    const { userId } = await auth();
    const { tripId } = await params;
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const searchParams = new URL(request.url).searchParams;
    const include = searchParams.get('include')?.split(',') || [];

    const trip = await tripService.getTrip({
      userId,
      tripId: tripId,
      include,
    });

    return NextResponse.json(trip);
  } catch (error) {
    console.error('[TRIP_GET]', error);

    if (error instanceof Error && error.message === 'Trip not found') {
      return new NextResponse('Trip not found', { status: 404 });
    }

    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { tripId: string } }) {
  try {
    const { userId } = await auth();
    const { tripId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = new URL(request.url).searchParams;
    const include = searchParams.get('include')?.split(',') || [];

    const body = await request.json();
    const { startDate, endDate, cityId } = body;

    const updatedTrip = await tripService.updateTrip({
      userId,
      tripId,
      data: {
        ...body,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        cityId,
      },
      include,
    });

    return NextResponse.json({
      message: 'Trip updated successfully',
      data: updatedTrip,
      activitiesCleared: cityId && cityId !== updatedTrip.cityId,
    });
  } catch (error) {
    console.error('[TRIP_UPDATE]', error);

    if (error instanceof Error) {
      switch (error.message) {
        case 'Trip not found':
          return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
        case 'Invalid date format':
          return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
        case 'Start date must be before end date':
          return NextResponse.json(
            { error: 'Start date must be before end date' },
            { status: 400 }
          );
      }
    }

    if (error instanceof PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2025':
          return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        case 'P2003':
          return NextResponse.json({ error: 'Invalid city ID' }, { status: 400 });
        default:
          return NextResponse.json({ error: 'Database operation failed' }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { tripId: string } }) {
  try {
    const { userId } = await auth();
    const { tripId } = await params;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await tripService.deleteTrip({
      userId,
      tripId,
    });

    return NextResponse.json({
      message: 'Trip deleted successfully',
      data: result,
    });
  } catch (error) {
    console.error('[TRIP_DELETE]', error);

    if (error instanceof Error && error.message === 'Trip not found') {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    if (error instanceof PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2003':
          return NextResponse.json(
            { error: 'Failed to delete related activities' },
            { status: 400 }
          );
        default:
          return NextResponse.json({ error: 'Database operation failed' }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
