import { auth } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { BudgetLevel } from '@/lib/types';

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

    const {
      city: cityData,
      startDate,
      endDate,
      ...tripData
    }: CreateTripRequest = await request.json();

    // Create the trip with city relation
    const city = await prisma.city.upsert({
      where: {
        name_countryCode: {
          name: cityData.name,
          countryCode: cityData.countryCode,
        },
      },
      create: {
        name: cityData.name,
        countryCode: cityData.countryCode,
        latitude: cityData.latitude,
        longitude: cityData.longitude,
        placeId: cityData.placeId,
      },
      update: {},
    });

    // Create the trip with properly typed data
    const trip = await prisma.trip.create({
      data: {
        ...tripData,
        city: {
          connect: {
            id: city.id,
          },
        },
        user: {
          connect: {
            id: userId,
          },
        },
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });

    return NextResponse.json(trip);
  } catch (error) {
    console.error('Error creating trip:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
