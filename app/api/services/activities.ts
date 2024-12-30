import { OpeningHours } from '@googlemaps/google-maps-services-js';
import { addMinutes, isSameDay } from 'date-fns';

import { ParsedItineraryActivity, ParsedTrip } from '@/app/trips/[tripId]/types';
import { prisma } from '@/lib/db';
import { getTransitTime } from '@/lib/maps/utils';
import { ActivityStatus } from '@/lib/stores/activitiesStore';
import { ActivityRecommendation } from '@/lib/types/recommendations';

import { findAvailableSlots, scoreTimeSlot } from './utils';

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

interface ScheduleResults {
  scheduled: ParsedItineraryActivity[];
  unscheduled: ParsedItineraryActivity[];
  warnings: string[];
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

    return trip as unknown as ParsedTrip;
  },

  async findBestTimeSlot(
    trip: ParsedTrip,
    recommendation: ActivityRecommendation,
    existingActivities: ParsedItineraryActivity[]
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
                lat: previousActivity.recommendation.location.latitude,
                lng: previousActivity.recommendation.location.longitude,
              },
              {
                lat: recommendation.location.latitude,
                lng: recommendation.location.longitude,
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
    const recommendation = (await prisma.activityRecommendation.findUnique({
      where: { id: recommendationId },
    })) as unknown as ActivityRecommendation;

    if (!recommendation) {
      throw new Error('Activity recommendation not found');
    }

    // Find the best time slot
    try {
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
    } catch (error) {
      throw new Error(`Unable to schedule activity: ${(error as Error).message}`);
    }
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
    const currentActivity = (await prisma.itineraryActivity.findUnique({
      where: { id: activityId },
      include: { recommendation: true },
    })) as unknown as ParsedItineraryActivity;

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
        startTime: undefined,
        endTime: undefined,
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
    const recommendation = (await prisma.activityRecommendation.findUnique({
      where: { id: recommendationId },
    })) as unknown as ActivityRecommendation;

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

  async rebalanceSchedule(tripId: string, userId: string): Promise<ScheduleResults> {
    // Validate trip access
    const trip = await this.validateTripAccess(tripId, userId);

    // Get all planned activities
    const activities = trip.activities.filter(
      activity => activity.status === 'planned'
    ) as ParsedItineraryActivity[];

    // Sort activities by priority
    const sortedActivities = activities.sort((a, b) => {
      // Must-see attractions get highest priority
      if (a.recommendation.isMustSee !== b.recommendation.isMustSee) {
        return a.recommendation.isMustSee ? -1 : 1;
      }
      // Restaurants get next priority for meal timing
      if (
        a.recommendation.placeTypes.includes('restaurant') !==
        b.recommendation.placeTypes.includes('restaurant')
      ) {
        return a.recommendation.placeTypes.includes('restaurant') ? -1 : 1;
      }
      // Then sort by rating
      return (b.recommendation.rating || 0) - (a.recommendation.rating || 0);
    });

    // Clear all scheduling data
    await prisma.itineraryActivity.updateMany({
      where: { tripId },
      data: {
        startTime: undefined,
        endTime: undefined,
        transitTimeFromPrevious: 0,
      },
    });

    const results: ScheduleResults = {
      scheduled: [],
      unscheduled: [],
      warnings: [],
    };

    // Schedule each activity in priority order
    for (const activity of sortedActivities) {
      try {
        const { bestSlot, bestTransitTime } = await this.findBestTimeSlot(
          trip,
          activity.recommendation,
          results.scheduled
        );

        const endTime = new Date(bestSlot);
        endTime.setMinutes(endTime.getMinutes() + activity.recommendation.duration);

        const updatedActivity = await prisma.itineraryActivity.update({
          where: { id: activity.id },
          data: {
            startTime: bestSlot,
            endTime,
            transitTimeFromPrevious: bestTransitTime,
          },
          include: {
            recommendation: true,
          },
        });

        results.scheduled.push(updatedActivity as unknown as ParsedItineraryActivity);
      } catch (error) {
        results.unscheduled.push(activity);
        results.warnings.push(
          `Could not schedule ${activity.recommendation.name}: ${(error as Error).message}`
        );
      }
    }

    return results;
  },
};
