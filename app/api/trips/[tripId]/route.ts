import { auth } from '@clerk/nextjs/server';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { NextRequest, NextResponse } from 'next/server';

import { tripService } from '@/app/api/services/trips';

export async function GET(request: NextRequest, { params }: { params: { tripId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const searchParams = new URL(request.url).searchParams;
    const include = searchParams.get('include')?.split(',') || [];

    const trip = await tripService.getTrip({
      userId,
      tripId: params.tripId,
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

export async function DELETE(_req: Request, { params }: { params: { tripId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await tripService.deleteTrip({
      userId,
      tripId: params.tripId,
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
