import { OpeningHours } from '@googlemaps/google-maps-services-js';
import { Prisma } from '@prisma/client';
import { addMinutes } from 'date-fns';

import { isOpenAtTime } from '@/lib/maps/utils';

// Use Prisma's generated types for better type safety
type ActivityWithRecommendation = Prisma.ItineraryActivityGetPayload<{
  include: { recommendation: true };
}>;

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

// Constants aligned with your schema
const MEAL_WINDOWS = {
  breakfast: {
    start: 9,
    end: 10.5,
    duration: 90,
    required: false,
  },
  lunch: {
    start: 12,
    end: 13.5,
    duration: 90,
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
  art_gallery: 40,
  restaurant: 20,
  beach: 70,
  night_club: 80,
  entertainment: 60,
  monument: 40,
  landmark: 50,
  market: 60,
} as const;

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function getReservedMealBlocks(activities: ActivityWithRecommendation[], date: Date): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  const dayActivities = activities.filter(activity =>
    isSameDay(new Date(activity.startTime), date)
  );

  Object.entries(MEAL_WINDOWS).forEach(([mealType, window]) => {
    const hasMeal = hasMealScheduled(dayActivities, mealType as keyof typeof MEAL_WINDOWS);

    if (mealType === 'breakfast') {
      const hasActivityDuringBreakfast = dayActivities.some(activity => {
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

function getDayBalance(activities: ActivityWithRecommendation[], date: Date): DayBalance {
  const dayActivities = activities.filter(activity =>
    isSameDay(new Date(activity.startTime), date)
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
  activities: ActivityWithRecommendation[],
  type: keyof typeof MEAL_WINDOWS
): boolean {
  const window = MEAL_WINDOWS[type];
  return activities.some(activity => {
    const time = new Date(activity.startTime).getHours();
    return (
      activity.recommendation.placeTypes.includes('restaurant') &&
      time >= window.start &&
      time <= window.end
    );
  });
}

function calculateDayIntensity(activities: ActivityWithRecommendation[]): number {
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

export function scoreTimeSlot(
  slot: Date,
  transitTime: number,
  dayActivities: ActivityWithRecommendation[],
  isRestaurant: boolean
): number {
  let score = 100;
  const hour = slot.getHours();

  // Transit time penalty
  score -= Math.min(30, transitTime / 2);

  // Time of day energy levels
  if (hour < 11) score += 10;
  if (hour > 14 && hour < 17) score -= 10;

  // Restaurant timing
  if (isRestaurant) {
    const inMealWindow = Object.values(MEAL_WINDOWS).some(
      window => hour >= window.start && hour <= window.end
    );
    if (!inMealWindow) score -= 30;
  } else if (hour >= MEAL_WINDOWS.breakfast.start && hour < MEAL_WINDOWS.breakfast.end) {
    score -= 10;
  }

  // Day balance factors
  const dayBalance = getDayBalance(dayActivities, slot);
  if (dayBalance.activityCount >= 4) score -= 20;
  if (dayBalance.intensity > 70) score -= 15;

  return score;
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

export function findAvailableSlots(
  activities: ActivityWithRecommendation[],
  date: Date,
  duration: number,
  openingHours: OpeningHours,
  isRestaurant: boolean
): Date[] {
  const dayActivities = activities.filter(activity =>
    isSameDay(new Date(activity.startTime), date)
  );

  const slots: Date[] = [];

  // Restaurant-specific logic
  if (isRestaurant) {
    Object.entries(MEAL_WINDOWS).forEach(([mealType, window]) => {
      if (!hasMealScheduled(dayActivities, mealType as keyof typeof MEAL_WINDOWS)) {
        const mealSlot = new Date(date);
        mealSlot.setHours(window.start, 0, 0, 0);

        if (isOpenAtTime(openingHours, mealSlot)) {
          const hasConflict = dayActivities.some(activity => {
            const activityStart = new Date(activity.startTime);
            const activityEnd = new Date(activity.endTime);
            return mealSlot >= activityStart && mealSlot <= activityEnd;
          });

          if (!hasConflict) {
            slots.push(mealSlot);
          }
        }
      }
    });
    return slots;
  }

  // Regular activity logic remains the same but with updated types
  const reservedBlocks = getReservedMealBlocks(activities, date);
  const requiredMealBlocks = reservedBlocks.filter(block => block.required);
  const breakfastBlock = reservedBlocks.find(block => !block.required);

  // Try slots within current day that maintain meal gaps
  if (dayActivities.length > 0) {
    const lastActivity = dayActivities[dayActivities.length - 1];
    const lastEnd = new Date(lastActivity.endTime);

    // If activity ends before lunch window, try after lunch
    if (lastEnd.getHours() < MEAL_WINDOWS.lunch.end) {
      const afterLunch = new Date(date);
      afterLunch.setHours(MEAL_WINDOWS.lunch.end + 0.5, 30, 0, 0); // 2:00 PM

      if (
        isOpenAtTime(openingHours, afterLunch) &&
        isOpenAtTime(openingHours, addMinutes(afterLunch, duration))
      ) {
        slots.push(afterLunch);
      }
    }
    // If activity ends after lunch but before dinner, try after dinner
    else if (lastEnd.getHours() < MEAL_WINDOWS.dinner.start) {
      const afterDinner = new Date(date);
      afterDinner.setHours(MEAL_WINDOWS.dinner.end, 30, 0, 0); // 8:30 PM

      if (
        isOpenAtTime(openingHours, afterDinner) &&
        isOpenAtTime(openingHours, addMinutes(afterDinner, duration))
      ) {
        slots.push(afterDinner);
      }
    }
  }

  // If no same-day slots work, look for slots on this or future days
  if (slots.length === 0) {
    let currentTime = new Date(date);
    currentTime.setHours(10, 0, 0, 0);
    const endTime = new Date(date);
    endTime.setHours(20, 0, 0, 0);

    // Combine all existing activities and required meal blocks
    const allBlocks = [
      ...requiredMealBlocks,
      ...dayActivities.map(activity => ({
        start: new Date(activity.startTime),
        end: new Date(activity.endTime),
        type: 'activity' as const,
        required: true,
      })),
    ].sort((a, b) => a.start.getTime() - b.start.getTime());

    // Find gaps between blocks
    while (currentTime < endTime) {
      const nextBlock = allBlocks.find(block => block.start > currentTime);

      if (!nextBlock) {
        const potentialEndTime = addMinutes(currentTime, duration);
        if (
          potentialEndTime <= endTime &&
          isOpenAtTime(openingHours, currentTime) &&
          isOpenAtTime(openingHours, potentialEndTime) &&
          !conflictsWithMeals(requiredMealBlocks, currentTime, potentialEndTime)
        ) {
          slots.push(new Date(currentTime));
        }
        break;
      }

      const gap = nextBlock.start.getTime() - currentTime.getTime();
      const gapMinutes = gap / (1000 * 60);

      if (gapMinutes >= duration) {
        const potentialEndTime = addMinutes(currentTime, duration);
        if (
          isOpenAtTime(openingHours, currentTime) &&
          isOpenAtTime(openingHours, potentialEndTime) &&
          !conflictsWithMeals(requiredMealBlocks, currentTime, potentialEndTime)
        ) {
          slots.push(new Date(currentTime));
        }
      }

      currentTime = new Date(nextBlock.end);
    }
  }

  // Add breakfast time as a potential slot if activity is short enough
  if (breakfastBlock && duration <= MEAL_WINDOWS.breakfast.duration) {
    const breakfastStart = new Date(breakfastBlock.start);
    const breakfastEnd = addMinutes(breakfastStart, duration);

    if (
      isOpenAtTime(openingHours, breakfastStart) &&
      isOpenAtTime(openingHours, breakfastEnd) &&
      !dayActivities.some(
        activity =>
          isSameDay(breakfastStart, new Date(activity.startTime)) &&
          new Date(activity.startTime).getHours() === MEAL_WINDOWS.breakfast.start
      )
    ) {
      slots.push(breakfastStart);
    }
  }

  return slots;

  return slots;
}
