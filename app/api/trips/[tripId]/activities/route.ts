import { auth } from '@clerk/nextjs/server';
import { OpeningHours } from '@googlemaps/google-maps-services-js';
import { addMinutes, isSameDay } from 'date-fns';
import { NextResponse } from 'next/server';

import { getTransitTime } from '@/lib/maps/utils';

import { findAvailableSlots, ItineraryActivity, scoreTimeSlot } from './utils';

export async function POST(request: Request, { params }: { params: { tripId: string } }) {
  try {
    // Auth check
    const { userId } = await auth();
    const { tripId } = await params;
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get request data
    const { recommendationId } = await request.json();

    // Fetch trip and validate ownership
    const trip = await prisma.trip.findUnique({
      where: {
        id: tripId,
        userId,
      },
      include: {
        activities: {
          include: {
            recommendation: true,
          },
          orderBy: {
            startTime: 'asc',
          },
        },
      },
    });

    if (!trip) {
      return new NextResponse('Trip not found', { status: 404 });
    }

    // Get recommendation
    const recommendation = await prisma.activityRecommendation.findUnique({
      where: {
        id: recommendationId,
      },
    });

    if (!recommendation) {
      return new NextResponse('Activity recommendation not found', { status: 404 });
    }

    // Main Scheduling Logic
    let bestSlot: Date | null = null;
    let bestScore = -Infinity;
    let bestTransitTime = Infinity;

    const currentDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);
    const isRestaurant = recommendation.type === 'restaurant';

    while (currentDate <= endDate && !bestSlot) {
      const availableSlots = findAvailableSlots(
        trip.activities,
        currentDate,
        recommendation.duration,
        recommendation.openingHours as OpeningHours,
        isRestaurant
      );

      for (const slot of availableSlots) {
        const previousActivity = trip.activities
          .filter((a: ItineraryActivity) => new Date(a.endTime) <= slot)
          .sort(
            (a: ItineraryActivity, b: ItineraryActivity) =>
              new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
          )[0];

        const transitTime = previousActivity
          ? await getTransitTime(
              {
                lat: previousActivity.recommendation.latitude,
                lng: previousActivity.recommendation.longitude,
              },
              {
                lat: recommendation.latitude,
                lng: recommendation.longitude,
              },
              new Date(previousActivity.endTime)
            )
          : 30;

        const score = scoreTimeSlot(
          slot,
          transitTime,
          (trip.activities as ItineraryActivity[]).filter(a =>
            isSameDay(new Date(a.startTime), currentDate)
          ),
          isRestaurant
        );

        if (score > bestScore) {
          bestScore = score;
          bestTransitTime = transitTime;
          bestSlot = slot;
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(10, 0, 0, 0);
    }

    if (!bestSlot) {
      return new NextResponse('No suitable time slots found', { status: 400 });
    }

    // Calculate final times
    const startTime = addMinutes(bestSlot, bestTransitTime);
    const endTime = addMinutes(startTime, recommendation.duration);

    // Create the activity
    const activity = await prisma.itineraryActivity.create({
      data: {
        tripId,
        recommendationId: recommendation.id,
        startTime,
        endTime,
        transitTimeFromPrevious: bestTransitTime,
        status: 'planned',
      },
      include: {
        recommendation: true,
      },
    });

    return NextResponse.json({ activity });
  } catch (error) {
    console.error('Error adding activity:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
