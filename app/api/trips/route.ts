import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const data = await request.json();

    // Create the trip with properly typed data
    const trip = await prisma.trip.create({
      data: {
        userId,
        title: data.title,
        destination: data.destination,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        preferences: {
          budget: data.preferences.budget,
          activities: data.preferences.activities,
          location: data.preferences.location,
        },
      },
    });

    return NextResponse.json({ trip });
  } catch (error) {
    console.error('Error creating trip:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
