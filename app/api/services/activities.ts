import { ActivityStatus, ParsedItineraryActivity } from '@/app/trips/[tripId]/types';
import { prisma } from '@/lib/db';
import { UpdateableActivityFields } from '@/lib/stores/activitiesStore';

import { tripService } from './trips';
import { isActivityOpenDuring, scheduleActivities } from './utils';

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

    // Schedule activities
    await scheduleActivities(plannedActivities, trip);

    // After scheduling, check each activity's new time against opening hours
    // and update warnings accordingly
    for (const activity of plannedActivities) {
      if (activity.startTime && activity.endTime) {
        const isOpen = isActivityOpenDuring(
          { openingHours: { periods: activity.recommendation.openingHours?.periods } },
          new Date(activity.startTime)
        );

        if (!isOpen) {
          await prisma.itineraryActivity.update({
            where: { id: activity.id },
            data: {
              warning:
                'This activity might be closed during the scheduled time. Please verify the opening hours.',
            },
          });
        } else {
          // Clear any existing warnings if the activity is now scheduled during open hours
          await prisma.itineraryActivity.update({
            where: { id: activity.id },
            data: {
              warning: null,
            },
          });
        }
      }
    }

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

    let warning = null;

    // If updating time, check if activity is open
    if (updates.startTime) {
      const activity = (await prisma.itineraryActivity.findUnique({
        where: { id: activityId },
        include: { recommendation: true },
      })) as unknown as ParsedItineraryActivity;

      if (!activity?.recommendation) {
        throw new Error('Activity not found');
      }

      const startTime = new Date(updates.startTime);

      if (
        !isActivityOpenDuring(
          { openingHours: { periods: activity.recommendation.openingHours!.periods } },
          startTime
        )
      ) {
        warning =
          'This activity might be closed during the selected time. Please verify the opening hours.';
      }
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
        warning: warning,
      },
      include: {
        recommendation: true,
      },
    });

    return { activity: updatedActivity, warning };
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
