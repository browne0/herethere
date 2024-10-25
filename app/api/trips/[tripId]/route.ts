import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export async function GET(req: Request, { params }: { params: { tripId: string } }) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const trip = await prisma.trip.findUnique({
      where: {
        id: params.tripId,
        userId,
      },
    });

    return NextResponse.json(trip);
  } catch (error) {
    console.error('[TRIP_GET]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
