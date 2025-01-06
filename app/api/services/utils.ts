import { protos } from '@googlemaps/places';
import { addMinutes, differenceInDays } from 'date-fns';

import { ParsedItineraryActivity, ParsedTrip } from '@/app/trips/[tripId]/types';
import { prisma } from '@/lib/db';
import { StartTime, UserPreferences } from '@/lib/stores/preferences';
import { ActivityRecommendation } from '@/lib/types/recommendations';

import { preferencesService } from './preferences';
import { getTransitTime } from './scheduling/transitTime';

interface DayBalance {
  activityCount: number;
  totalDuration: number;
  hasLunch: boolean;
  hasDinner: boolean;
  intensity: number;
}

interface TimeBlock {
  start: Date;
  end: Date;
  type: 'meal' | 'activity';
  required: boolean;
}

interface TimeCalculation {
  minutes: number;
  hours: number;
  days: number;
}

interface TimeSlotResult {
  bestSlot: Date | null;
  bestTransitTime: number;
}

// Constants aligned with your schema
const MEAL_WINDOWS = {
  breakfast: {
    start: 8,
    end: 11.5,
    duration: 90,
    required: false,
  },
  lunch: {
    start: 12,
    end: 15.5,
    duration: 60,
    required: true,
  },
  dinner: {
    start: 18,
    end: 20,
    duration: 120,
    required: true,
  },
} as const;

// Updated intensity weights based on your place types
const INTENSITY_WEIGHTS: Record<string, number> = {
  historic_site: 60,
  museum: 40,
  art_gallery: 25,
  restaurant: 20,
  beach: 70,
  night_club: 80,
  entertainment: 60,
  monument: 40,
  landmark: 50,
  market: 60,
} as const;

const getPreferredStartHour = (startTime: StartTime) => {
  switch (startTime) {
    case 'early':
      return 7; // Early bird - before 8am
    case 'mid':
      return 9; // Mid-morning - 9-10am
    case 'late':
      return 10; // Later start - after 10am
    default:
      return 9; // Default to mid-morning if not specified
  }
};

function isSameDay(date1: Date | null, date2: Date | null): boolean {
  if (!date1 || !date2) return false;
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isTimeWithinAnyPeriod(
  time: Date,
  periods: protos.google.maps.places.v1.Place.IOpeningHours['periods']
): boolean {
  if (!periods?.length) return false;

  const timeHour = time.getHours();
  const timeMinute = time.getMinutes();
  const dayOfWeek = time.getDay();

  return periods.some(period => {
    // For 24-hour locations where we just have an opening time with no close
    if (period.open && !period.close) {
      return period.open.day === dayOfWeek;
    }

    // For regular hours
    if (!period.open || !period.close) return false;

    const openDay = period.open.day;
    const openHour = period.open.hour;
    const openMinute = period.open.minute || 0;
    const closeHour = period.close.hour;
    const closeMinute = period.close.minute || 0;

    if (openDay !== dayOfWeek || typeof openHour !== 'number' || typeof closeHour !== 'number') {
      return false;
    }

    // Convert all times to minutes for easier comparison
    const timeInMinutes = timeHour * 60 + timeMinute;
    const openInMinutes = openHour * 60 + openMinute;
    const closeInMinutes = closeHour * 60 + closeMinute;

    return timeInMinutes >= openInMinutes && timeInMinutes <= closeInMinutes;
  });
}
function getReservedMealBlocks(activities: ParsedItineraryActivity[], date: Date): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  const dayActivities = activities.filter(activity =>
    activity.startTime ? isSameDay(new Date(activity.startTime), date) : false
  );

  Object.entries(MEAL_WINDOWS).forEach(([mealType, window]) => {
    const hasMeal = hasMealScheduled(dayActivities, mealType as keyof typeof MEAL_WINDOWS);

    if (mealType === 'breakfast') {
      const hasActivityDuringBreakfast = dayActivities.some(activity => {
        if (!activity.startTime) return false;
        const activityHour = new Date(activity.startTime).getHours();
        return activityHour >= window.start && activityHour < window.end;
      });
      if (hasActivityDuringBreakfast) return;
    }

    if (!hasMeal && (window.required || mealType === 'breakfast')) {
      const blockStart = new Date(date);
      blockStart.setHours(window.start, 0, 0, 0);
      const blockEnd = new Date(blockStart);
      blockEnd.setMinutes(blockEnd.getMinutes() + window.duration);

      blocks.push({
        start: blockStart,
        end: blockEnd,
        type: 'meal',
        required: window.required,
      });
    }
  });

  return blocks;
}

function getDayBalance(activities: ParsedItineraryActivity[], date: Date): DayBalance {
  const dayActivities = activities.filter(activity =>
    activity.startTime ? isSameDay(new Date(activity.startTime), date) : false
  );

  return {
    activityCount: dayActivities.length,
    totalDuration: dayActivities.reduce((sum, act) => sum + act.recommendation.duration, 0),
    hasLunch: hasMealScheduled(dayActivities, 'lunch'),
    hasDinner: hasMealScheduled(dayActivities, 'dinner'),
    intensity: calculateDayIntensity(dayActivities),
  };
}

function hasMealScheduled(
  activities: ParsedItineraryActivity[],
  type: keyof typeof MEAL_WINDOWS
): boolean {
  const window = MEAL_WINDOWS[type];
  return activities.some(activity => {
    if (!activity.startTime) return false;
    const time = new Date(activity.startTime).getHours();
    return (
      activity.recommendation.placeTypes.includes('restaurant') &&
      time >= window.start &&
      time <= window.end
    );
  });
}

function calculateDayIntensity(activities: ParsedItineraryActivity[]): number {
  if (activities.length === 0) return 0;

  const totalIntensity = activities.reduce((sum, activity) => {
    // Find the highest intensity among the place types
    const maxIntensity = Math.max(
      ...activity.recommendation.placeTypes.map(type => INTENSITY_WEIGHTS[type] || 50)
    );
    return sum + maxIntensity;
  }, 0);

  return Math.round(totalIntensity / activities.length);
}

function isInMealWindow(slot: Date): boolean {
  const hour = slot.getHours();
  const minutes = slot.getMinutes();
  const timeInHours = hour + minutes / 60;

  // Check if the time falls within any meal window
  return Object.values(MEAL_WINDOWS).some(window => {
    return timeInHours >= window.start && timeInHours <= window.end;
  });
}

function scoreTimeSlot(
  slot: Date,
  transitTime: number,
  existingActivities: ParsedItineraryActivity[],
  recommendation: ActivityRecommendation,
  tripStart: Date,
  tripEnd: Date,
  userPreferences: UserPreferences
): number {
  let score = 100;

  if (recommendation.placeTypes.includes('art_gallery')) {
    // Check for museums and galleries on the same day
    const culturalActivitiesToday = existingActivities.filter(
      activity =>
        activity.startTime &&
        isSameDay(new Date(activity.startTime), slot) &&
        activity.recommendation.placeTypes.some(type => type === 'museum' || type === 'art_gallery')
    );

    const museumsToday = culturalActivitiesToday.filter(a =>
      a.recommendation.placeTypes.includes('museum')
    ).length;

    const galleriesScheduled = culturalActivitiesToday.filter(a =>
      a.recommendation.placeTypes.includes('art_gallery')
    ).length;

    // Heavily penalize scheduling galleries after museums (fatigue)
    if (museumsToday > 0) {
      score -= 40;
    }
    // Modest penalty for each additional gallery, but allow up to 6
    else if (galleriesScheduled >= 6) {
      score -= 50;
    } else {
      score -= galleriesScheduled * 10;
    }
  }

  const hour = slot.getHours();

  // Calculate schedule fullness
  const totalMinutes = calculateAvailableTime({ startDate: tripStart, endDate: tripEnd });
  const scheduledMinutes = existingActivities.reduce(
    (sum, activity) => sum + activity.recommendation.duration + activity.transitTimeFromPrevious,
    0
  );
  const scheduleFullness = Math.min(scheduledMinutes / totalMinutes, 1);

  // Base scoring logic
  if (hour < 11) score += 10; // Early morning bonus
  if (hour > 14 && hour < 17) score -= 10; // Afternoon penalty

  const energyLevel = userPreferences.energyLevel;
  const dayBalance = getDayBalance(existingActivities, slot);

  if (energyLevel === 1) {
    if (dayBalance.activityCount > 3) score -= 30;
    if (dayBalance.totalDuration > 240) score -= 20;
  } else if (energyLevel === 2) {
    if (dayBalance.activityCount > 4) score -= 20;
    if (dayBalance.totalDuration > 360) score -= 15;
  } else if (energyLevel === 3) {
    if (dayBalance.activityCount > 6) score -= 10;
    if (dayBalance.totalDuration > 480) score -= 10;
  }

  const preferredStartHour = getPreferredStartHour(userPreferences.preferredStartTime);
  if (hour < preferredStartHour) {
    score -= 30; // Heavy penalty for scheduling before preferred start time
  }

  // Reduced density penalty as schedule fills up
  if (dayBalance.activityCount > 4) {
    score -= Math.max(5, 20 * (1 - scheduleFullness));
  }

  // Transit time penalty remains constant
  score -= Math.min(30, transitTime / 2);

  // Calculate distance penalty that reduces as schedule fills up
  const daysFromNearest = calculateDaysFromNearestActivity(slot, existingActivities);
  const distancePenalty = daysFromNearest * (5 * (1 - scheduleFullness));
  score -= distancePenalty;

  // Restaurant-specific timing
  if (recommendation.placeTypes.includes('restaurant')) {
    const inMealWindow = isInMealWindow(slot);
    if (!inMealWindow) score -= 30;
  }

  return score;
}

function calculateDaysFromNearestActivity(
  slot: Date,
  activities: ParsedItineraryActivity[]
): number {
  if (activities.length === 0) return 0;

  const scheduledDates = activities
    .filter(a => a.startTime)
    .map(a => new Date(a.startTime as Date));

  if (scheduledDates.length === 0) return 0;

  const distances = scheduledDates.map(date => Math.abs(date.getDate() - slot.getDate()));

  return Math.min(...distances);
}

function conflictsWithMeals(requiredMealBlocks: TimeBlock[], start: Date, end: Date): boolean {
  return requiredMealBlocks.some(block => {
    const blockStart = block.start.getTime();
    const blockEnd = block.end.getTime();
    const slotStart = start.getTime();
    const slotEnd = end.getTime();
    return slotStart < blockEnd && slotEnd > blockStart;
  });
}

function hasActivityConflict(
  start: Date,
  end: Date,
  activities: ParsedItineraryActivity[]
): boolean {
  return activities.some(activity => {
    if (!activity.startTime || !activity.endTime) return false;

    const activityStart = new Date(activity.startTime);
    const activityEnd = new Date(activity.endTime);

    // Check if either the start or end of the new slot overlaps with an existing activity
    // or if the new slot completely encompasses an existing activity
    return (
      (start >= activityStart && start < activityEnd) ||
      (end > activityStart && end <= activityEnd) ||
      (start <= activityStart && end >= activityEnd)
    );
  });
}

export function findAvailableSlots(
  activities: ParsedItineraryActivity[],
  date: Date,
  duration: number,
  openingHours: protos.google.maps.places.v1.Place.IOpeningHours | null | undefined,
  isRestaurant: boolean,
  tripStart: Date,
  tripEnd: Date,
  userPreferences: UserPreferences
): Date[] {
  // Early return if the date is outside trip bounds
  if (date < tripStart || date > tripEnd) {
    return [];
  }

  const slots: Date[] = [];
  const periods = openingHours?.periods || [];

  // Get the periods for this day of week
  const dayPeriods = periods.filter(period => period?.open?.day === date.getDay());

  // If no periods for this day, return empty slots
  if (!dayPeriods.length) {
    console.warn(`No opening hours found for day ${date.getDay()}`);
    return slots;
  }

  // Check if location is open 24 hours
  const is24Hours = dayPeriods.some(
    period => period.open?.hour === 0 && period.open?.minute === 0 && !period.close
  );

  const preferredStartHour = getPreferredStartHour(userPreferences.preferredStartTime);

  // For 24-hour locations, we'll use reasonable time slots between 8 AM and 10 PM
  if (is24Hours) {
    const endHour = 22; // 10 PM

    let currentTime = new Date(date);
    currentTime.setHours(preferredStartHour, 0, 0, 0);

    // If we're on the start date and it's after our start time,
    // begin from the current time rounded up to the next half hour
    if (isSameDay(currentTime, tripStart) && currentTime < tripStart) {
      currentTime = new Date(tripStart);
      const minutes = currentTime.getMinutes();
      currentTime.setMinutes(Math.ceil(minutes / 30) * 30, 0, 0);
    }

    const endTime = new Date(date);
    endTime.setHours(endHour, 0, 0, 0);

    // If we're on the end date, use the trip end time if it's earlier
    if (isSameDay(date, tripEnd) && endTime > tripEnd) {
      endTime.setTime(tripEnd.getTime());
    }

    // Generate slots every 30 minutes
    while (currentTime <= endTime) {
      const potentialEndTime = new Date(currentTime);
      potentialEndTime.setMinutes(potentialEndTime.getMinutes() + duration);

      // Check for conflicts with existing activities and meal times
      if (
        !hasActivityConflict(currentTime, potentialEndTime, activities) &&
        !conflictsWithMeals(getReservedMealBlocks(activities, date), currentTime, potentialEndTime)
      ) {
        slots.push(new Date(currentTime));
      }

      currentTime.setMinutes(currentTime.getMinutes() + 30);
    }

    return slots;
  }

  // Get activities for just this day
  const dayActivities = activities.filter(
    activity =>
      activity.startTime && activity.endTime && isSameDay(new Date(activity.startTime), date)
  );

  // Handle restaurants differently since they need to align with meal windows
  if (isRestaurant) {
    Object.entries(MEAL_WINDOWS).forEach(([mealType, window]) => {
      // Skip if this meal is already scheduled
      if (hasMealScheduled(dayActivities, mealType as keyof typeof MEAL_WINDOWS)) {
        return;
      }

      dayPeriods.forEach(period => {
        if (
          period.open?.hour == null ||
          period.close?.hour == null ||
          period.open.minute == null ||
          period.close.minute == null
        )
          return;

        // Convert meal window times to minutes for easier comparison
        const windowStartMinutes = window.start * 60;
        const windowEndMinutes = window.end * 60;

        // Convert opening hours to minutes
        const openTimeMinutes = period.open.hour * 60 + period.open.minute;
        const closeTimeMinutes = period.close.hour * 60 + period.close.minute;

        // Find the overlap between meal window and opening hours
        const overlapStart = Math.max(windowStartMinutes, openTimeMinutes);
        const overlapEnd = Math.min(windowEndMinutes, closeTimeMinutes);

        if (overlapStart < overlapEnd && overlapEnd - overlapStart >= duration) {
          // Create a slot at the start of the overlap period
          const slotTime = new Date(date);
          slotTime.setHours(Math.floor(overlapStart / 60));
          slotTime.setMinutes(overlapStart % 60);

          // Strict validation against trip dates
          if (slotTime >= tripStart && slotTime <= tripEnd) {
            // Verify no conflicts with existing activities
            const slotEndTime = new Date(slotTime);
            slotEndTime.setMinutes(slotEndTime.getMinutes() + duration);

            if (slotEndTime <= tripEnd) {
              const hasConflict = dayActivities.some(activity => {
                if (!activity.startTime || !activity.endTime) return false;
                const activityStart = new Date(activity.startTime);
                const activityEnd = new Date(activity.endTime);
                return slotTime >= activityStart && slotTime <= activityEnd;
              });

              if (!hasConflict) {
                slots.push(slotTime);
              }
            }
          }
        }
      });
    });

    return slots;
  }

  // For non-restaurant activities
  const reservedBlocks = getReservedMealBlocks(activities, date);
  const requiredMealBlocks = reservedBlocks.filter(block => block.required);

  dayPeriods.forEach(period => {
    if (
      period.open?.hour == null ||
      period.close?.hour == null ||
      period.open.minute == null ||
      period.close.minute == null
    )
      return;

    let startTime = new Date(date);
    startTime.setHours(period.open.hour, period.open.minute, 0, 0);
    // Ensure we don't start before trip start
    if (startTime < tripStart) startTime = new Date(tripStart);

    // Don't start before user's preferred time
    if (startTime.getHours() < preferredStartHour) {
      startTime.setHours(preferredStartHour, 0, 0, 0);
    }

    const periodEnd = new Date(date);
    periodEnd.setHours(period.close.hour, period.close.minute, 0, 0);
    // Ensure we don't go past trip end
    const effectiveEndTime = periodEnd > tripEnd ? tripEnd : periodEnd;

    const currentTime = new Date(startTime);
    while (currentTime <= effectiveEndTime) {
      const potentialEndTime = new Date(currentTime);
      potentialEndTime.setMinutes(potentialEndTime.getMinutes() + duration);

      // Strict validation: ensure both start and end times are within trip dates and opening hours
      if (
        potentialEndTime <= tripEnd &&
        isTimeWithinAnyPeriod(currentTime, dayPeriods) &&
        isTimeWithinAnyPeriod(potentialEndTime, dayPeriods)
      ) {
        // Then check for meal time conflicts
        const hasMealConflict = conflictsWithMeals(
          requiredMealBlocks,
          currentTime,
          potentialEndTime
        );

        // Finally check for conflicts with existing activities
        const hasActivityConflict = dayActivities.some(activity => {
          if (!activity.startTime || !activity.endTime) return false;
          const activityStart = new Date(activity.startTime);
          const activityEnd = new Date(activity.endTime);
          return (
            (currentTime >= activityStart && currentTime < activityEnd) ||
            (potentialEndTime > activityStart && potentialEndTime <= activityEnd) ||
            (currentTime <= activityStart && potentialEndTime >= activityEnd)
          );
        });

        if (!hasMealConflict && !hasActivityConflict) {
          slots.push(new Date(currentTime));
        }
      }

      currentTime.setMinutes(currentTime.getMinutes() + 30);
    }
  });

  return slots;
}

// Calculate total available time in the trip
export function calculateAvailableTime(trip: Pick<ParsedTrip, 'endDate' | 'startDate'>): number {
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);

  // Calculate full days
  const days = differenceInDays(endDate, startDate) + 1;

  // Assume 10 hours per day of activity time (8AM - 6PM)
  // This accounts for travel time, breaks, etc.
  const HOURS_PER_DAY = 10;

  return days * HOURS_PER_DAY * 60; // Return total minutes available
}

// Calculate how much time all activities will take
export function calculateTotalTimeNeeded(activities: ParsedItineraryActivity[]): number {
  return activities.reduce((total, activity) => {
    const activityDuration = activity.recommendation.duration;

    // Add transit time between activities (either existing or estimated)
    const transitTime = activity.transitTimeFromPrevious || 30; // Default 30min if not calculated

    // Add buffer time for each activity (checkin, security, etc)
    const bufferTime = 15;

    return total + activityDuration + transitTime + bufferTime;
  }, 0);
}

// Format duration for error messages and UI
export function formatDuration(minutes: number): string {
  const calculation: TimeCalculation = {
    minutes: minutes % 60,
    hours: Math.floor(minutes / 60) % 24,
    days: Math.floor(minutes / (60 * 24)),
  };

  const parts = [];
  if (calculation.days > 0) {
    parts.push(`${calculation.days} day${calculation.days === 1 ? '' : 's'}`);
  }
  if (calculation.hours > 0) {
    parts.push(`${calculation.hours} hour${calculation.hours === 1 ? '' : 's'}`);
  }
  if (calculation.minutes > 0) {
    parts.push(`${calculation.minutes} minute${calculation.minutes === 1 ? '' : 's'}`);
  }

  return parts.join(' and ');
}

// Clear existing scheduling data to rebuild schedule
export async function clearSchedulingData(tripId: string): Promise<void> {
  await prisma.itineraryActivity.updateMany({
    where: {
      tripId,
      status: 'planned',
    },
    data: {
      startTime: null,
      endTime: null,
      transitTimeFromPrevious: 0,
    },
  });
}

// Schedule all planned activities
export async function scheduleActivities(
  activities: ParsedItineraryActivity[],
  trip: ParsedTrip
): Promise<number> {
  const userPreferences = await preferencesService.getPreferences(trip.userId);

  let scheduledMinutes = 0;
  const scheduledActivities: ParsedItineraryActivity[] = [];

  const sortedActivities = activities.sort((a, b) => {
    // First priority: Must-see attractions
    if (a.recommendation.isMustSee !== b.recommendation.isMustSee) {
      return a.recommendation.isMustSee ? -1 : 1;
    }

    // Second priority: Restaurants (to ensure proper meal timing)
    if (
      a.recommendation.placeTypes.includes('restaurant') !==
      b.recommendation.placeTypes.includes('restaurant')
    ) {
      return a.recommendation.placeTypes.includes('restaurant') ? -1 : 1;
    }

    // Third priority: Activity intensity based on user's energy level
    const getIntensityScore = (activity: ParsedItineraryActivity) => {
      const intensity = Math.max(
        ...activity.recommendation.placeTypes.map(type => INTENSITY_WEIGHTS[type] || 50)
      );
      // Adjust intensity score based on user preference
      switch (userPreferences.energyLevel) {
        case 1:
          return -intensity;
        case 3:
          return intensity;
        default:
          return 0;
      }
    };

    const intensityDiff = getIntensityScore(b) - getIntensityScore(a);
    if (intensityDiff !== 0) return intensityDiff;

    // Finally, sort by rating
    return b.recommendation.rating - a.recommendation.rating;
  });

  for (const activity of sortedActivities) {
    const { bestSlot, bestTransitTime } = await findBestTimeSlot(
      trip,
      activity.recommendation,
      scheduledActivities,
      userPreferences
    );

    if (!bestSlot) {
      console.warn(`Could not find valid slot for activity ${activity.id}`);
      continue;
    }

    await prisma.itineraryActivity.update({
      where: { id: activity.id },
      data: {
        startTime: bestSlot,
        endTime: addMinutes(bestSlot, activity.recommendation.duration),
        transitTimeFromPrevious: bestTransitTime,
      },
    });

    const updatedActivity = {
      ...activity,
      startTime: bestSlot,
      endTime: addMinutes(bestSlot, activity.recommendation.duration),
      transitTimeFromPrevious: bestTransitTime,
    };
    scheduledActivities.push(updatedActivity);
    scheduledMinutes += activity.recommendation.duration + bestTransitTime;
  }

  return scheduledMinutes;
}

/**
 * Attempts to fit interested activities into remaining schedule time
 * Considers existing planned activities and schedule constraints
 */
export async function tryFitInterestedActivities(
  trip: ParsedTrip,
  tripId: string,
  remainingMinutes: number
): Promise<void> {
  // Get both interested and already planned activities
  const [interestedActivities, plannedActivities] = await Promise.all([
    prisma.itineraryActivity.findMany({
      where: {
        tripId,
        status: 'interested',
      },
      include: {
        recommendation: true,
      },
      orderBy: {
        recommendation: {
          rating: 'desc',
        },
      },
    }),
    prisma.itineraryActivity.findMany({
      where: {
        tripId,
        status: 'planned',
      },
      include: {
        recommendation: true,
      },
    }),
  ]);

  const userPreferences = await preferencesService.getPreferences(trip.userId);

  let availableMinutes = remainingMinutes;
  const currentSchedule = plannedActivities as unknown as ParsedItineraryActivity[];

  for (const activity of interestedActivities) {
    const timeNeeded = activity.recommendation.duration + 45; // Activity + transit/buffer

    if (availableMinutes >= timeNeeded) {
      try {
        const { bestSlot, bestTransitTime } = await findBestTimeSlot(
          trip,
          activity.recommendation as unknown as ActivityRecommendation,
          currentSchedule,
          userPreferences
        );

        if (bestSlot) {
          const updatedActivity = await prisma.itineraryActivity.update({
            where: { id: activity.id },
            data: {
              status: 'planned',
              startTime: bestSlot,
              endTime: addMinutes(bestSlot, activity.recommendation.duration),
              transitTimeFromPrevious: bestTransitTime,
            },
            include: {
              recommendation: true,
            },
          });

          // Add the newly scheduled activity to our tracking array
          currentSchedule.push(updatedActivity as unknown as ParsedItineraryActivity);
          availableMinutes -= timeNeeded;
        }
      } catch (error) {
        // If we can't find a slot for this activity, skip it and try the next one
        console.warn(`Could not schedule interested activity ${activity.id}:`, error);
        continue;
      }
    }
  }
}

export async function findBestTimeSlot(
  trip: ParsedTrip,
  recommendation: ActivityRecommendation,
  existingActivities: ParsedItineraryActivity[],
  userPreferences: UserPreferences
): Promise<TimeSlotResult> {
  let bestSlot: Date | null = null;
  let bestScore = -Infinity;
  let bestTransitTime = 30;

  // Create proper Date objects with time components
  const tripStart = new Date(trip.startDate);
  const tripEnd = new Date(trip.endDate);
  tripEnd.setHours(23, 59, 59, 999);

  // Ensure we don't start before trip start date
  const currentDate = new Date(tripStart);

  const scheduledActivities = existingActivities.filter(
    activity => activity.startTime && activity.endTime
  );

  const isRestaurant = recommendation.placeTypes.includes('restaurant');

  while (currentDate <= tripEnd) {
    const availableSlots = findAvailableSlots(
      scheduledActivities,
      currentDate,
      recommendation.duration,
      recommendation.openingHours as protos.google.maps.places.v1.Place.IOpeningHours,
      isRestaurant,
      tripStart,
      tripEnd,
      userPreferences
    );

    for (const slot of availableSlots) {
      // Skip slots outside trip dates
      if (slot < tripStart || slot > tripEnd) {
        continue;
      }

      const previousActivity = scheduledActivities
        .filter(a => {
          if (!a.endTime) return false;
          const endTime = new Date(a.endTime);
          return endTime <= slot && endTime >= tripStart && isSameDay(endTime, slot);
        })
        .sort((a, b) => {
          if (!a.endTime || !b.endTime) return 0;
          return new Date(b.endTime).getTime() - new Date(a.endTime).getTime();
        })[0];

      const transitTime = previousActivity
        ? await getTransitTime(
            {
              latitude: previousActivity.recommendation.location.latitude,
              longitude: previousActivity.recommendation.location.longitude,
            },
            {
              latitude: recommendation.location.latitude,
              longitude: recommendation.location.longitude,
            },
            previousActivity.endTime ? new Date(previousActivity.endTime) : new Date()
          )
        : 30;

      if (previousActivity && previousActivity.endTime) {
        const previousEndTime = new Date(previousActivity.endTime);
        const minimumStartTime = new Date(previousEndTime);
        minimumStartTime.setMinutes(minimumStartTime.getMinutes() + transitTime);

        if (slot < minimumStartTime) {
          continue;
        }
      }

      const score = scoreTimeSlot(
        slot,
        transitTime,
        existingActivities,
        recommendation,
        tripStart,
        tripEnd,
        userPreferences
      );

      if (score > bestScore) {
        bestScore = score;
        bestTransitTime = transitTime;
        bestSlot = slot;
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(8, 0, 0, 0);
  }

  return {
    bestSlot,
    bestTransitTime,
  };
}

export function validateActivityTimeSlot(
  startTime: Date | null,
  duration: number,
  tripStart: Date,
  tripEnd: Date
): boolean {
  if (!startTime) return false;

  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + duration);

  return startTime >= tripStart && endTime <= tripEnd;
}
