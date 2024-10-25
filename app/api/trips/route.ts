import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const trip = await prisma.trip.create({
      data: {
        userId,
        ...body,
      },
    });

    return NextResponse.json(trip);
  } catch (error) {
    console.error('[TRIPS_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const trips = await prisma.trip.findMany({
      where: {
        userId,
      },
    });

    return NextResponse.json(trips);
  } catch (error) {
    console.error('[TRIPS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
