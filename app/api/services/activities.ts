import { OpeningHours } from '@googlemaps/google-maps-services-js';
import { Prisma, Trip } from '@prisma/client';
import { addMinutes, isSameDay } from 'date-fns';

import { prisma } from '@/lib/db';
import { getTransitTime } from '@/lib/maps/utils';
import { ActivityStatus } from '@/lib/stores/activitiesStore';

import { findAvailableSlots, scoreTimeSlot } from '../trips/[tripId]/activities/utils';

type ActivityWithRecommendation = Prisma.ItineraryActivityGetPayload<{
  include: { recommendation: true };
}>;

interface ScheduleActivityParams {
  tripId: string;
  userId: string;
  recommendationId: string;
}

interface UpdateActivityParams {
  tripId: string;
  activityId: string;
  userId: string;
  status: ActivityStatus;
}

interface CreateActivityParams {
  tripId: string;
  userId: string;
  recommendationId: string;
  status: ActivityStatus;
}

interface TimeSlotResult {
  bestSlot: Date;
  bestTransitTime: number;
}

export const activityService = {
  async validateTripAccess(tripId: string, userId: string) {
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
      throw new Error('Trip not found');
    }

    return trip;
  },

  async findBestTimeSlot(
    trip: Trip,
    recommendation: Prisma.ActivityRecommendationGetPayload<object>,
    existingActivities: ActivityWithRecommendation[]
  ): Promise<TimeSlotResult> {
    let bestSlot: Date | null = null;
    let bestScore = -Infinity;
    let bestTransitTime = Infinity;

    const currentDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);

    // Check if this is a food-related activity
    const isRestaurant = recommendation.placeTypes.includes('restaurant');

    while (currentDate <= endDate && !bestSlot) {
      const availableSlots = findAvailableSlots(
        existingActivities,
        currentDate,
        recommendation.duration,
        recommendation.openingHours as unknown as OpeningHours,
        isRestaurant
      );

      for (const slot of availableSlots) {
        // Find the most recent previous activity
        const previousActivity = existingActivities
          .filter(a => new Date(a.endTime) <= slot)
          .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())[0];

        // Calculate transit time from previous activity
        const transitTime = previousActivity
          ? await getTransitTime(
              {
                lat: (previousActivity.recommendation.location as any).latitude,
                lng: (previousActivity.recommendation.location as any).longitude,
              },
              {
                lat: (recommendation.location as any).latitude,
                lng: (recommendation.location as any).longitude,
              },
              new Date(previousActivity.endTime)
            )
          : 30; // Default transit time if no previous activity

        const score = scoreTimeSlot(
          slot,
          transitTime,
          existingActivities.filter(a => isSameDay(new Date(a.startTime), currentDate)),
          isRestaurant
        );

        if (score > bestScore) {
          bestScore = score;
          bestTransitTime = transitTime;
          bestSlot = slot;
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(10, 0, 0, 0); // Reset to start of day
    }

    if (!bestSlot) {
      throw new Error('No suitable time slots found');
    }

    return {
      bestSlot,
      bestTransitTime,
    };
  },

  async scheduleActivity({ tripId, userId, recommendationId }: ScheduleActivityParams) {
    // Validate trip access first
    const trip = await this.validateTripAccess(tripId, userId);

    // Get the recommendation details
    const recommendation = await prisma.activityRecommendation.findUnique({
      where: { id: recommendationId },
    });

    if (!recommendation) {
      throw new Error('Activity recommendation not found');
    }

    // Find the best time slot
    const { bestSlot, bestTransitTime } = await this.findBestTimeSlot(
      trip,
      recommendation,
      trip.activities
    );

    // Calculate start and end times
    const startTime = addMinutes(bestSlot, bestTransitTime);
    const endTime = addMinutes(startTime, recommendation.duration);

    // Create the activity in the itinerary
    return await prisma.itineraryActivity.create({
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
  },

  async deleteActivity(params: { tripId: string; activityId: string; userId: string }) {
    const { tripId, userId, activityId } = await params;

    // Verify trip ownership first
    const trip = await prisma.trip.findUnique({
      where: {
        id: tripId,
        userId: userId,
      },
      include: {
        activities: {
          where: {
            id: activityId,
          },
        },
      },
    });

    if (!trip) {
      throw new Error('Trip not found');
    }

    if (trip.activities.length === 0) {
      throw new Error('Activity not found in trip');
    }

    // Delete the activity
    const deletedActivity = await prisma.itineraryActivity.delete({
      where: {
        id: activityId,
        tripId: tripId,
      },
    });

    return deletedActivity;
  },

  async updateActivity({ tripId, activityId, userId, status }: UpdateActivityParams) {
    // Validate trip access first
    const trip = await this.validateTripAccess(tripId, userId);

    // Get the current activity
    const currentActivity = await prisma.itineraryActivity.findUnique({
      where: { id: activityId },
      include: { recommendation: true },
    });

    if (!currentActivity) {
      throw new Error('Activity not found');
    }

    // If changing to planned status, we need to schedule it
    if (status === 'planned') {
      // Find the best time slot using existing service method
      const { bestSlot, bestTransitTime } = await this.findBestTimeSlot(
        trip,
        currentActivity.recommendation,
        trip.activities
      );

      // Calculate start and end times
      const startTime = addMinutes(bestSlot, bestTransitTime);
      const endTime = addMinutes(startTime, currentActivity.recommendation.duration);

      return await prisma.itineraryActivity.update({
        where: { id: activityId },
        data: {
          status,
          startTime,
          endTime,
          transitTimeFromPrevious: bestTransitTime,
        },
        include: {
          recommendation: true,
        },
      });
    }

    // For other statuses (interested, etc), clear scheduling data
    return await prisma.itineraryActivity.update({
      where: { id: activityId },
      data: {
        status,
        // Clear scheduling data if not planned
        startTime: new Date(),
        endTime: new Date(),
        transitTimeFromPrevious: 0,
      },
      include: {
        recommendation: true,
      },
    });
  },

  async createActivity({ tripId, userId, recommendationId, status }: CreateActivityParams) {
    // Validate trip access first
    const trip = await this.validateTripAccess(tripId, userId);

    // Get the recommendation
    const recommendation = await prisma.activityRecommendation.findUnique({
      where: { id: recommendationId },
    });

    if (!recommendation) {
      throw new Error('Activity recommendation not found');
    }

    // For 'interested' status, create without scheduling
    if (status === 'interested') {
      return await prisma.itineraryActivity.create({
        data: {
          tripId,
          recommendationId,
          status,
          startTime: new Date(),
          endTime: new Date(),
          transitTimeFromPrevious: 0,
        },
        include: {
          recommendation: true,
        },
      });
    }

    // For 'planned' status, use the scheduling logic
    const { bestSlot, bestTransitTime } = await this.findBestTimeSlot(
      trip,
      recommendation,
      trip.activities
    );

    const startTime = addMinutes(bestSlot, bestTransitTime);
    const endTime = addMinutes(startTime, recommendation.duration);

    return await prisma.itineraryActivity.create({
      data: {
        tripId,
        recommendationId,
        status,
        startTime,
        endTime,
        transitTimeFromPrevious: bestTransitTime,
      },
      include: {
        recommendation: true,
      },
    });
  },
};
