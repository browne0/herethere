import { formatInTimeZone } from 'date-fns-tz';

import { ActivityStatus, ParsedItineraryActivity } from '@/app/trips/[tripId]/types';
import { prisma } from '@/lib/db';
import { UpdateableActivityFields } from '@/lib/stores/activitiesStore';

import { tripService } from './trips';
import {
  getNextOpeningTime,
  isActivityOpenDuring,
  isTimeWithinPeriod,
  scheduleActivities,
} from './utils';

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
      include: ['activities', 'city'],
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

    for (const activity of plannedActivities) {
      if (activity.startTime) {
        let warning = null;

        if (activity.recommendation.openingHours?.periods?.length) {
          const startTime = new Date(activity.startTime);
          const localDay = Number(formatInTimeZone(startTime, trip.city.timezone, 'e')) - 1;

          const relevantPeriod = activity.recommendation.openingHours.periods.find(
            period =>
              period?.open?.day === localDay ||
              (period?.open?.day === (localDay + 6) % 7 && period?.close?.day === localDay)
          );

          if (
            relevantPeriod &&
            !isTimeWithinPeriod(startTime, relevantPeriod, trip.city.timezone)
          ) {
            warning =
              'This activity might be closed at the selected time. Please verify the opening hours.';
          }
        }

        await prisma.itineraryActivity.update({
          where: { id: activity.id },
          data: { warning },
        });
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
        warning: null,
      },
      include: { recommendation: true },
    });
  },

  async updateActivity({ tripId, activityId, userId, updates }: UpdateActivityParams) {
    // Get trip with city to access timezone
    const trip = await tripService.getTrip({
      userId,
      tripId,
      include: ['city'],
    });

    if (!trip) {
      throw new Error('Trip not found');
    }

    let warning = null;

    if (updates.startTime) {
      const activity = (await prisma.itineraryActivity.findUnique({
        where: { id: activityId },
        include: { recommendation: true },
      })) as unknown as ParsedItineraryActivity;

      if (!activity?.recommendation) {
        throw new Error('Activity not found');
      }

      // Only show warning if we have opening hours data AND the time is definitely outside them
      if (activity.recommendation.openingHours?.periods?.length) {
        const startTime = new Date(updates.startTime);
        const localDay = Number(formatInTimeZone(startTime, trip.city.timezone, 'e')) - 1;

        const relevantPeriod = activity.recommendation.openingHours.periods.find(
          period =>
            period?.open?.day === localDay ||
            (period?.open?.day === (localDay + 6) % 7 && period?.close?.day === localDay)
        );

        // Only warn if we're confident about the hours for this day
        if (relevantPeriod && !isTimeWithinPeriod(startTime, relevantPeriod, trip.city.timezone)) {
          warning =
            'This activity might be closed at the selected time. Please verify the opening hours.';
        }
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
        warning,
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
