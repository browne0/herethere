import { ParsedItineraryActivity } from '@/app/trips/[tripId]/types';
import { prisma } from '@/lib/db';
import { ActivityStatus } from '@/lib/stores/activitiesStore';

import { tripService } from './trips';
import {
  calculateAvailableTime,
  calculateTotalTimeNeeded,
  formatDuration,
  clearSchedulingData,
  scheduleActivities,
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
}

export const activityService = {
  async rebalanceSchedule(tripId: string, userId: string): Promise<ScheduleResults> {
    const trip = await tripService.getTrip({
      userId,
      tripId,
      include: ['activities'],
    });

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

    await clearSchedulingData(tripId);

    await scheduleActivities(plannedActivities, trip);

    const updatedActivities = (await prisma.itineraryActivity.findMany({
      where: { tripId },
      include: { recommendation: true },
      orderBy: { startTime: 'asc' },
    })) as unknown as ParsedItineraryActivity[];

    return {
      scheduled: updatedActivities.filter(a => a.status === 'planned' && a.startTime),
      unscheduled: updatedActivities.filter(a => a.status === 'planned' && !a.startTime),
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

  async createActivity({ tripId, recommendationId, status }: CreateActivityParams) {
    const recommendation = await prisma.activityRecommendation.findUnique({
      where: { id: recommendationId },
    });

    if (!recommendation) {
      throw new Error('Activity recommendation not found');
    }

    return await prisma.itineraryActivity.create({
      data: {
        tripId,
        recommendationId,
        status,
        startTime: null,
        endTime: null,
        transitTimeFromPrevious: 0,
      },
      include: { recommendation: true },
    });
  },

  async updateActivity({ activityId, status }: UpdateActivityParams) {
    const currentActivity = await prisma.itineraryActivity.findUnique({
      where: { id: activityId },
      include: { recommendation: true },
    });

    if (!currentActivity) {
      throw new Error('Activity not found');
    }

    // Just update the status, clear any scheduling data
    return await prisma.itineraryActivity.update({
      where: { id: activityId },
      data: {
        status,
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
