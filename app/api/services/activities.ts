import { ParsedItineraryActivity } from '@/app/trips/[tripId]/types';
import { prisma } from '@/lib/db';
import { ActivityStatus } from '@/lib/stores/activitiesStore';
import { ActivityRecommendation } from '@/lib/types/recommendations';

import { tripService } from './trips';
import {
  calculateAvailableTime,
  calculateTotalTimeNeeded,
  formatDuration,
  clearSchedulingData,
  scheduleActivities,
  tryFitInterestedActivities,
  findBestTimeSlot,
  validateActivityTimeSlot,
} from './utils';

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

interface ScheduleResults {
  scheduled: ParsedItineraryActivity[];
  unscheduled: ParsedItineraryActivity[];
  warnings: string[];
}

export const activityService = {
  async rebalanceSchedule(tripId: string, userId: string): Promise<ScheduleResults> {
    const trip = await tripService.getTrip({
      userId,
      tripId,
      include: ['activities'],
    });

    const tripStart = new Date(trip.startDate);
    const tripEnd = new Date(trip.endDate);
    tripEnd.setHours(23, 59, 59, 999);

    const plannedActivities = (await prisma.itineraryActivity.findMany({
      where: {
        tripId,
        status: 'planned',
      },
      include: {
        recommendation: true,
      },
      orderBy: {
        recommendation: {
          isMustSee: 'desc',
        },
      },
    })) as unknown as ParsedItineraryActivity[];

    const availableTime = calculateAvailableTime(trip);
    const requiredTime = calculateTotalTimeNeeded(plannedActivities);

    if (requiredTime > availableTime) {
      return {
        scheduled: [],
        unscheduled: plannedActivities,
        warnings: [
          `Trip is overbooked. Need ${formatDuration(requiredTime)} but only have ${formatDuration(availableTime)}.`,
        ],
      };
    }

    await clearSchedulingData(tripId);

    const scheduledMinutes = await scheduleActivities(plannedActivities, trip);
    const remainingTime = availableTime - scheduledMinutes;

    if (remainingTime > 0) {
      await tryFitInterestedActivities(trip, tripId, remainingTime);
    }

    const updatedActivities = (await prisma.itineraryActivity.findMany({
      where: { tripId },
      include: { recommendation: true },
      orderBy: { startTime: 'asc' },
    })) as unknown as ParsedItineraryActivity[];

    // Additional validation of scheduled activities
    const validatedActivities = updatedActivities.map(activity => {
      if (
        activity.status === 'planned' &&
        activity.startTime &&
        !validateActivityTimeSlot(
          new Date(activity.startTime),
          activity.recommendation.duration,
          tripStart,
          tripEnd
        )
      ) {
        // If activity doesn't fit within trip dates, mark as unscheduled
        return {
          ...activity,
          startTime: null,
          endTime: null,
        };
      }
      return activity;
    });

    return {
      scheduled: validatedActivities.filter(a => a.status === 'planned' && a.startTime),
      unscheduled: validatedActivities.filter(a => a.status === 'planned' && !a.startTime),
      warnings: [],
    };
  },

  async validatePlannedCapacity(tripId: string, userId: string) {
    const trip = await tripService.getTrip({
      userId,
      tripId,
      include: ['activities'],
    });

    const plannedActivities = trip.activities.filter(a => a.status === 'planned');
    const availableTime = calculateAvailableTime(trip);
    const requiredTime = calculateTotalTimeNeeded(plannedActivities);

    if (requiredTime > availableTime) {
      throw new Error(
        `Trip is at capacity. Current activities require ${formatDuration(requiredTime)} but only ${formatDuration(availableTime)} available.`
      );
    }
  },

  async createActivity({ tripId, userId, recommendationId, status }: CreateActivityParams) {
    const trip = await tripService.getTrip({
      userId,
      tripId,
      include: ['activities'],
    });

    const recommendation = await prisma.activityRecommendation.findUnique({
      where: { id: recommendationId },
    });

    if (!recommendation) {
      throw new Error('Activity recommendation not found');
    }

    if (status === 'planned') {
      await this.validatePlannedCapacity(tripId, userId);
    }

    const baseActivity = {
      tripId,
      recommendationId,
      status,
      transitTimeFromPrevious: 0,
    };

    // For interested activities, no scheduling needed
    if (status === 'interested') {
      return await prisma.itineraryActivity.create({
        data: {
          ...baseActivity,
          startTime: null,
          endTime: null,
        },
        include: { recommendation: true },
      });
    }

    // For planned activities, we need to find a valid slot
    const tripStart = new Date(trip.startDate);
    const tripEnd = new Date(trip.endDate);
    tripEnd.setHours(23, 59, 59, 999);

    const { bestSlot, bestTransitTime } = await findBestTimeSlot(
      trip,
      recommendation as unknown as ActivityRecommendation,
      trip.activities
    );

    // Additional validation for the found slot
    if (bestSlot) {
      const activityEndTime = new Date(bestSlot);
      activityEndTime.setMinutes(activityEndTime.getMinutes() + recommendation.duration);

      // Verify the entire activity fits within trip dates
      if (bestSlot >= tripStart && activityEndTime <= tripEnd) {
        return await prisma.itineraryActivity.create({
          data: {
            ...baseActivity,
            startTime: bestSlot,
            endTime: activityEndTime,
            transitTimeFromPrevious: bestTransitTime,
          },
          include: { recommendation: true },
        });
      }
    }

    // If no valid slot found or slot validation failed, create unscheduled activity
    return await prisma.itineraryActivity.create({
      data: {
        ...baseActivity,
        startTime: null,
        endTime: null,
      },
      include: { recommendation: true },
    });
  },

  async updateActivity({ tripId, activityId, userId, status }: UpdateActivityParams) {
    const trip = await tripService.getTrip({
      userId,
      tripId,
      include: ['activities'],
    });

    const tripStart = new Date(trip.startDate);
    const tripEnd = new Date(trip.endDate);
    tripEnd.setHours(23, 59, 59, 999);

    const currentActivity = await prisma.itineraryActivity.findUnique({
      where: { id: activityId },
      include: { recommendation: true },
    });

    if (!currentActivity) {
      throw new Error('Activity not found');
    }

    if (status === 'planned') {
      await this.validatePlannedCapacity(tripId, userId);

      const { bestSlot, bestTransitTime } = await findBestTimeSlot(
        trip,
        currentActivity.recommendation as unknown as ActivityRecommendation,
        trip.activities
      );

      if (bestSlot) {
        const activityEndTime = new Date(bestSlot);
        activityEndTime.setMinutes(
          activityEndTime.getMinutes() + currentActivity.recommendation.duration
        );

        // Validate that the activity fits within trip dates
        if (
          validateActivityTimeSlot(
            bestSlot,
            currentActivity.recommendation.duration,
            tripStart,
            tripEnd
          )
        ) {
          return await prisma.itineraryActivity.update({
            where: { id: activityId },
            data: {
              status,
              startTime: bestSlot,
              endTime: activityEndTime,
              transitTimeFromPrevious: bestTransitTime,
            },
            include: { recommendation: true },
          });
        }
      }

      // If no valid slot found or validation failed, update without scheduling
      return await prisma.itineraryActivity.update({
        where: { id: activityId },
        data: {
          status,
          startTime: null,
          endTime: null,
          transitTimeFromPrevious: 0,
        },
        include: { recommendation: true },
      });
    }

    // For non-planned status, clear scheduling data
    return await prisma.itineraryActivity.update({
      where: { id: activityId },
      data: {
        status,
        startTime: null,
        endTime: null,
        transitTimeFromPrevious: 0,
      },
      include: { recommendation: true },
    });
  },

  async deleteActivity({ tripId, activityId }: { tripId: string; activityId: string }) {
    const activity = await prisma.itineraryActivity.findFirst({
      where: {
        id: activityId,
        tripId,
      },
    });

    if (!activity) {
      throw new Error('Activity not found in trip');
    }

    const deletedActivity = await prisma.itineraryActivity.delete({
      where: {
        id: activityId,
      },
    });

    return deletedActivity;
  },
};
