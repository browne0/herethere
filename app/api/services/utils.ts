import { protos } from '@googlemaps/places';
import { addMinutes, differenceInDays } from 'date-fns';

import { Location, ParsedItineraryActivity, ParsedTrip } from '@/app/trips/[tripId]/types';
import { CategoryMapping, PlaceCategory } from '@/constants';
import { prisma } from '@/lib/db';
import { StartTime, UserPreferences } from '@/lib/stores/preferences';
import { ActivityRecommendation } from '@/lib/types/recommendations';

import { preferencesService } from './preferences';
import { getTransitTime } from './scheduling/transitTime';

interface ValidateTimeSlotParams {
  startTime: Date | null;
  duration: number;
  tripStart: Date;
  tripEnd: Date;
  previousActivity?: ParsedItineraryActivity;
  existingActivities: ParsedItineraryActivity[];
  transitTime?: number;
}

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

interface ValidationResult {
  isValid: boolean;
  reason?: string;
  scoreAdjustment?: number;
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

const BUFFER_TIME_MINUTES = 10;
const MINIMUM_ACCEPTABLE_SCORE = -20;

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

const VENUE_TIMING = {
  spa: { start: 10, end: 16 },
  night_club: { start: 19, end: 26 }, // Using 26 to represent 2 AM next day
  bar: { start: 19, end: 26 },
};

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

function scoreTimeSlot(
  slot: Date,
  transitTime: number,
  existingActivities: ParsedItineraryActivity[],
  recommendation: ActivityRecommendation,
  tripStart: Date,
  tripEnd: Date,
  userPreferences: UserPreferences,
  scoreAdjustment: number = 0
): number {
  let score = 100 + scoreAdjustment;
  const hour = slot.getHours();

  // Check day balance - penalize days that already have many activities
  const activitiesOnDay = existingActivities.filter(
    a => a.startTime && isSameDay(new Date(a.startTime), slot)
  ).length;

  // Strong penalty for unbalanced days
  score -= Math.max(0, (activitiesOnDay - 3) * 25);

  // Get venue type and its optimal hours
  const venueType = recommendation.placeTypes.find(type => type in VENUE_TIMING);

  if (venueType) {
    const timing = VENUE_TIMING[venueType as keyof typeof VENUE_TIMING];
    if (hour < timing.start || hour > timing.end) {
      score -= 50; // Big penalty for wrong time of day
    }
  }

  const EVENING_VENUE_TYPES = CategoryMapping[PlaceCategory.NIGHTLIFE].includedTypes;

  const isEveningVenue = recommendation.placeTypes.some(type => EVENING_VENUE_TYPES.includes(type));

  // Base scoring logic
  if (hour < 11) score += 10;
  if (hour > 14 && hour < 17) score -= 5;

  if (hour >= 19) {
    score += 15; // Base evening bonus
    if (isEveningVenue) {
      // Additional bonus for evening venues in their prime time
      score += 25;

      // Extra bonus for optimal hours (8 PM - 11 PM)
      if (hour >= 20 && hour <= 23) {
        score += 15;
      }
    }
  } else if (hour < 1 && isEveningVenue) {
    // Handle early morning hours (after midnight)
    score += 30;
  }

  if (recommendation.placeTypes.includes('art_gallery')) {
    const culturalActivitiesToday = existingActivities.filter(
      activity =>
        activity.startTime &&
        isSameDay(new Date(activity.startTime), slot) &&
        activity.recommendation.placeTypes.some(type => type === 'museum' || type === 'art_gallery')
    );

    const culturalCount = culturalActivitiesToday.length;
    if (culturalCount > 0) {
      score -= culturalCount * 10;
    }
  }

  // Calculate schedule fullness
  const totalMinutes = calculateAvailableTime({ startDate: tripStart, endDate: tripEnd });
  const scheduledMinutes = existingActivities.reduce(
    (sum, activity) => sum + activity.recommendation.duration + activity.transitTimeFromPrevious,
    0
  );
  const scheduleFullness = Math.min(scheduledMinutes / totalMinutes, 1);

  const energyLevel = userPreferences.energyLevel;
  const dayBalance = getDayBalance(existingActivities, slot);

  if (energyLevel === 1) {
    if (dayBalance.activityCount > 4) score -= 20;
    if (dayBalance.totalDuration > 240) score -= 15;
  } else if (energyLevel === 2) {
    if (dayBalance.activityCount > 5) score -= 15;
    if (dayBalance.totalDuration > 360) score -= 10;
  } else if (energyLevel === 3) {
    if (dayBalance.activityCount > 6) score -= 10;
    if (dayBalance.totalDuration > 480) score -= 5;
  }

  const preferredStartHour = getPreferredStartHour(userPreferences.preferredStartTime);
  if (hour < preferredStartHour) {
    score -= 20;
  }

  // Reduced density penalty as schedule fills up
  if (dayBalance.activityCount > 4) {
    score -= Math.max(5, 10 * (1 - scheduleFullness));
  }

  // Transit time penalty remains constant
  score -= Math.min(20, transitTime / 3);

  if (existingActivities.length > 0) {
    const nearbyActivities = existingActivities.filter(activity => {
      if (!activity.startTime || !activity.recommendation.location) return false;
      return (
        isSameDay(new Date(activity.startTime), slot) &&
        calculateDistance(activity.recommendation.location, recommendation.location) < 2 // Within 2km
      );
    });

    if (nearbyActivities.length > 0) {
      score += 15; // Bonus for clustering
    }
  }

  return score;
}

function calculateDistance(loc1: Location, loc2: Location): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(loc2.latitude - loc1.latitude);
  const dLon = toRad(loc2.longitude - loc1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(loc1.latitude)) *
      Math.cos(toRad(loc2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
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

function handleRestaurantSlots(
  date: Date,
  duration: number,
  dayPeriods: protos.google.maps.places.v1.Place.IOpeningHours['periods'],
  existingActivities: ParsedItineraryActivity[],
  tripStart: Date,
  tripEnd: Date,
  mealWindows: typeof MEAL_WINDOWS
): Date[] {
  const slots: Date[] = [];

  // Skip if no periods for this day
  if (!dayPeriods?.length) return slots;

  // Check each meal window
  Object.entries(mealWindows).forEach(([mealType, window]) => {
    // Skip if this meal is already scheduled
    if (hasMealScheduled(existingActivities, mealType as keyof typeof mealWindows)) {
      return;
    }

    dayPeriods.forEach(period => {
      // Guard against null/undefined period entries
      if (!period?.open || !period?.close) {
        return;
      }

      // Guard against missing hour/minute values
      const openHour = period.open.hour;
      const openMinute = period.open.minute ?? 0;
      const closeHour = period.close.hour;
      const closeMinute = period.close.minute ?? 0;

      if (typeof openHour !== 'number' || typeof closeHour !== 'number') {
        return;
      }

      // Convert meal window times to minutes for easier comparison
      const windowStartMinutes = window.start * 60;
      const windowEndMinutes = window.end * 60;

      // Convert opening hours to minutes
      const openTimeMinutes = openHour * 60 + openMinute;
      let closeTimeMinutes = closeHour * 60 + closeMinute;

      // Adjust close time if it's past midnight
      if (period.close.day !== period.open.day) {
        closeTimeMinutes += 24 * 60;
      }

      // Find overlap between meal window and opening hours
      const overlapStart = Math.max(windowStartMinutes, openTimeMinutes);
      const overlapEnd = Math.min(windowEndMinutes, closeTimeMinutes);

      if (overlapStart < overlapEnd && overlapEnd - overlapStart >= duration) {
        // Create slots at 30-minute intervals within the overlap period
        for (let minutes = overlapStart; minutes <= overlapEnd - duration; minutes += 30) {
          const slotTime = new Date(date);
          slotTime.setHours(Math.floor(minutes / 60));
          slotTime.setMinutes(minutes % 60);

          // Handle slots that go past midnight
          if (Math.floor(minutes / 60) >= 24) {
            slotTime.setDate(slotTime.getDate() + 1);
            slotTime.setHours(Math.floor(minutes / 60) - 24);
          }

          // Skip if outside trip dates
          if (slotTime < tripStart || slotTime > tripEnd) {
            continue;
          }

          // Create end time for conflict checking
          const slotEndTime = new Date(slotTime);
          slotEndTime.setMinutes(slotEndTime.getMinutes() + duration);

          // Skip if ends after trip end
          if (slotEndTime > tripEnd) {
            continue;
          }

          // Check for conflicts with existing activities
          const hasConflict = existingActivities.some(activity => {
            if (!activity.startTime || !activity.endTime) return false;
            const activityStart = new Date(activity.startTime);
            const activityEnd = new Date(activity.endTime);
            return (
              (slotTime >= activityStart && slotTime < activityEnd) ||
              (slotEndTime > activityStart && slotEndTime <= activityEnd) ||
              (slotTime <= activityStart && slotEndTime >= activityEnd)
            );
          });

          if (!hasConflict) {
            slots.push(slotTime);
          }
        }
      }
    });
  });

  return slots;
}

export function findAvailableSlots(
  activities: ParsedItineraryActivity[],
  date: Date,
  duration: number,
  openingHours: protos.google.maps.places.v1.Place.IOpeningHours | null | undefined,
  isRestaurant: boolean,
  tripStart: Date,
  tripEnd: Date,
  userPreferences: UserPreferences,
  isLateNightVenue: boolean = false
): Date[] {
  // Early return if the date is outside trip bounds
  if (date < tripStart || date > tripEnd) {
    return [];
  }

  const slots: Date[] = [];
  const periods = openingHours?.periods || [];

  // For late night venues, include periods that start on current day OR end on next day
  const dayPeriods = isLateNightVenue
    ? periods.filter(
        period =>
          period?.open?.day === date.getDay() ||
          (period?.close?.day === (date.getDay() + 1) % 7 &&
            typeof period?.close?.hour === 'number' &&
            period.close.hour <= 4)
      )
    : periods.filter(period => period?.open?.day === date.getDay());

  if (!dayPeriods.length) {
    console.warn(`No opening hours found for day ${date.getDay()}`);
    return slots;
  }

  const is24Hours = dayPeriods.some(
    period => period.open?.hour === 0 && period.open?.minute === 0 && !period.close
  );

  const preferredStartHour = getPreferredStartHour(userPreferences.preferredStartTime);

  // Handle 24-hour locations
  if (is24Hours) {
    const endHour = isLateNightVenue ? 1 : 22;
    let currentTime = new Date(date);
    currentTime.setHours(preferredStartHour, 0, 0, 0);

    if (isSameDay(currentTime, tripStart) && currentTime < tripStart) {
      currentTime = new Date(tripStart);
      const minutes = currentTime.getMinutes();
      currentTime.setMinutes(Math.ceil(minutes / 30) * 30, 0, 0);
    }

    const endTime = new Date(date);
    if (isLateNightVenue) {
      endTime.setDate(endTime.getDate() + 1);
      endTime.setHours(endHour, 0, 0, 0);
    } else {
      endTime.setHours(endHour, 0, 0, 0);
    }

    if (isSameDay(date, tripEnd) && endTime > tripEnd) {
      endTime.setTime(tripEnd.getTime());
    }

    while (currentTime <= endTime) {
      const potentialEndTime = new Date(currentTime);
      potentialEndTime.setMinutes(potentialEndTime.getMinutes() + duration);

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

  // Get activities for just this day and potentially early morning next day
  const relevantActivities = activities.filter(activity => {
    if (!activity.startTime || !activity.endTime) return false;
    const activityStart = new Date(activity.startTime);
    if (isLateNightVenue) {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(4, 0, 0, 0);
      return (
        isSameDay(activityStart, date) ||
        (activityStart <= nextDay && activityStart.getDate() === date.getDate() + 1)
      );
    }
    return isSameDay(activityStart, date);
  });

  // Handle restaurants with meal windows
  if (isRestaurant) {
    return handleRestaurantSlots(
      date,
      duration,
      dayPeriods,
      relevantActivities,
      tripStart,
      tripEnd,
      MEAL_WINDOWS
    );
  }

  // For non-restaurant activities
  const reservedBlocks = getReservedMealBlocks(activities, date);
  const requiredMealBlocks = reservedBlocks.filter(block => block.required);

  dayPeriods.forEach(period => {
    // Guard against null/undefined period entries
    if (!period?.open || !period?.close) {
      return;
    }

    // Guard against missing hour/minute values
    const openHour = period.open.hour;
    const openMinute = period.open.minute ?? 0;
    const closeHour = period.close.hour;
    const closeMinute = period.close.minute ?? 0;

    if (typeof openHour !== 'number' || typeof closeHour !== 'number') {
      return;
    }

    let startTime = new Date(date);
    startTime.setHours(openHour, openMinute, 0, 0);
    if (startTime < tripStart) startTime = new Date(tripStart);

    if (startTime.getHours() < preferredStartHour && !isLateNightVenue) {
      startTime.setHours(preferredStartHour, 0, 0, 0);
    }

    let periodEnd = new Date(date);
    if (period.close.day !== period.open.day) {
      // Handle periods that cross midnight
      periodEnd.setDate(periodEnd.getDate() + 1);
    }
    periodEnd.setHours(closeHour, closeMinute, 0, 0);

    // For late night venues, don't go past 4 AM
    if (isLateNightVenue && periodEnd.getHours() >= 4 && periodEnd.getDate() > date.getDate()) {
      periodEnd = new Date(periodEnd);
      periodEnd.setHours(4, 0, 0, 0);
    }

    const effectiveEndTime = periodEnd > tripEnd ? tripEnd : periodEnd;

    const currentTime = new Date(startTime);
    while (currentTime <= effectiveEndTime) {
      const potentialEndTime = new Date(currentTime);
      potentialEndTime.setMinutes(potentialEndTime.getMinutes() + duration);

      if (
        potentialEndTime <= tripEnd &&
        isTimeWithinAnyPeriod(currentTime, dayPeriods) &&
        isTimeWithinAnyPeriod(potentialEndTime, dayPeriods)
      ) {
        const hasMealConflict = conflictsWithMeals(
          requiredMealBlocks,
          currentTime,
          potentialEndTime
        );

        const hasConflict = relevantActivities.some(activity => {
          if (!activity.startTime || !activity.endTime) return false;
          const activityStart = new Date(activity.startTime);
          const activityEnd = new Date(activity.endTime);
          return (
            (currentTime >= activityStart && currentTime < activityEnd) ||
            (potentialEndTime > activityStart && potentialEndTime <= activityEnd) ||
            (currentTime <= activityStart && potentialEndTime >= activityEnd)
          );
        });

        if (!hasMealConflict && !hasConflict) {
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
async function clearSchedulingData(tripId: string): Promise<void> {
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
  await clearSchedulingData(trip.id);
  const userPreferences = await preferencesService.getPreferences(trip.userId);

  let scheduledMinutes = 0;
  const scheduledActivities: ParsedItineraryActivity[] = [];
  const unscheduledActivities: ParsedItineraryActivity[] = [];

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
    try {
      const { bestSlot, bestTransitTime } = await findBestTimeSlot(
        trip,
        activity.recommendation,
        scheduledActivities,
        userPreferences
      );

      if (!bestSlot) {
        console.warn(`Could not find valid slot for activity ${activity.id}`);
        unscheduledActivities.push(activity);
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
    } catch (error) {
      console.error(`Error scheduling activity ${activity.id}:`, error);
      unscheduledActivities.push(activity);
    }
  }

  return scheduledMinutes;
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
    const EVENING_VENUE_TYPES = CategoryMapping[PlaceCategory.NIGHTLIFE].includedTypes;

    const isEveningVenue = recommendation.placeTypes.some(type =>
      EVENING_VENUE_TYPES.includes(type)
    );

    let endTime = new Date(currentDate);
    endTime.setHours(23, 59, 59, 999);

    // For late night venues, consider slots that extend into early morning of next day
    if (isEveningVenue) {
      const nextDay = new Date(currentDate);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(1, 0, 0, 0); // Allow scheduling until 1 AM
      endTime = nextDay;
    }

    const availableSlots = findAvailableSlots(
      scheduledActivities,
      currentDate,
      recommendation.duration,
      recommendation.openingHours as protos.google.maps.places.v1.Place.IOpeningHours,
      isRestaurant,
      tripStart,
      tripEnd,
      userPreferences,
      isEveningVenue
    );

    for (const slot of availableSlots) {
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

      const validation = await validateActivityTimeSlot({
        startTime: slot,
        duration: recommendation.duration,
        tripStart,
        tripEnd,
        previousActivity,
        existingActivities: scheduledActivities,
        transitTime,
      });

      // Skip this slot if it's not valid
      if (!validation.isValid) {
        continue;
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

      if (score > bestScore && score > MINIMUM_ACCEPTABLE_SCORE) {
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

export async function validateActivityTimeSlot({
  startTime,
  duration,
  tripStart,
  tripEnd,
  previousActivity,
  existingActivities,
  transitTime = 30,
}: ValidateTimeSlotParams): Promise<ValidationResult> {
  if (!startTime) {
    return { isValid: false, reason: 'No start time provided' };
  }

  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + duration);

  if (startTime < tripStart || endTime > tripEnd) {
    return {
      isValid: false,
      reason: 'Activity falls outside trip dates',
    };
  }

  // Check transit time with reduced buffer
  if (previousActivity && previousActivity.endTime) {
    const previousEndTime = new Date(previousActivity.endTime);
    const minimumStartTime = new Date(previousEndTime);
    minimumStartTime.setMinutes(minimumStartTime.getMinutes() + transitTime + BUFFER_TIME_MINUTES);

    if (startTime < minimumStartTime) {
      return {
        isValid: false,
        reason: `Insufficient transit time from previous activity`,
      };
    }
  }

  // Check for direct conflicts with existing activities
  const hasConflict = existingActivities.some(activity => {
    if (!activity.startTime || !activity.endTime) return false;

    const activityStart = new Date(activity.startTime);
    const activityEnd = new Date(activity.endTime);

    return (
      (startTime >= activityStart && startTime < activityEnd) ||
      (endTime > activityStart && endTime <= activityEnd) ||
      (startTime <= activityStart && endTime >= activityEnd)
    );
  });

  if (hasConflict) {
    return {
      isValid: false,
      reason: 'Time slot conflicts with existing activity',
    };
  }

  // Convert meal time conflicts to score adjustments instead of hard failures
  const mealtimeConflict = conflictsWithMeals(
    getReservedMealBlocks(existingActivities, startTime),
    startTime,
    endTime
  );

  if (mealtimeConflict) {
    return {
      isValid: true,
      scoreAdjustment: -20,
      reason: 'Conflicts with meal time',
    };
  }

  return { isValid: true, scoreAdjustment: 0 };
}
