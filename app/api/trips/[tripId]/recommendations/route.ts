import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export async function GET(request: Request, { params }: { params: { tripId: string } }) {
  const { tripId } = await params;
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  try {
    // First get the trip to get its city
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: { cityId: true },
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Now get recommendations for that city
    const recommendations = await prisma.activityRecommendation.findMany({
      where: {
        cityId: trip.cityId,
        rating: {
          gte: 4.0,
        },
        reviewCount: {
          gte: 100,
        },
      },
      orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
      take: 10,
    });

    return NextResponse.json({
      items: recommendations,
    });
  } catch (error) {
    console.error('Failed to fetch recommendations:', error);
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 });
  }
}
