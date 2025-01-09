import { ActivityStatus, ParsedItineraryActivity } from '@/app/trips/[tripId]/types';
import { prisma } from '@/lib/db';
import { UpdateableActivityFields } from '@/lib/stores/activitiesStore';

import { tripService } from './trips';
import { scheduleActivities } from './utils';

interface UpdateActivityParams {
  tripId: string;
  activityId: string;
  userId: string;
  updates: UpdateableActivityFields;
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

  async updateActivity({ tripId, activityId, userId, updates }: UpdateActivityParams) {
    // Verify the trip exists and belongs to the user
    const trip = await prisma.trip.findUnique({
      where: {
        id: tripId,
        userId,
      },
    });

    if (!trip) {
      throw new Error('Trip not found');
    }

    const updatedActivity = await prisma.itineraryActivity.update({
      where: {
        id: activityId,
        tripId,
      },
      data: {
        ...updates,
        startTime: updates.startTime != undefined ? new Date(updates.startTime) : undefined,
        endTime: updates.endTime != undefined ? new Date(updates.endTime) : undefined,
      },
      include: {
        recommendation: true, // Include the associated recommendation data
      },
    });

    return updatedActivity;
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
