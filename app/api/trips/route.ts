import { auth } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

import { BudgetLevel } from '@/lib/types';
import { tripService } from '../services/trips';

interface CreateTripRequest {
  title: string;
  startDate: Date;
  endDate: Date;
  preferences: {
    budget: BudgetLevel;
    activities: string[];
  };
  city: Prisma.CityCreateInput;
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const tripData: CreateTripRequest = await request.json();

    const trip = await tripService.createTrip({
      userId,
      ...tripData,
    });

    return NextResponse.json(trip);
  } catch (error) {
    console.error('Error creating trip:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
