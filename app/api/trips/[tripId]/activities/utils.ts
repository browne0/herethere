import { OpeningHours } from '@googlemaps/google-maps-services-js';
import { ActivityRecommendation } from '@prisma/client';
import { addMinutes } from 'date-fns';

import { isOpenAtTime } from '@/lib/maps/utils';

interface DayBalance {
  activityCount: number;
  totalDuration: number;
  hasLunch: boolean;
  hasDinner: boolean;
  intensity: number;
}

export interface ItineraryActivity {
  id: string;
  tripId: string;
  recommendationId: string;
  recommendation: ActivityRecommendation;
  startTime: Date;
  endTime: Date;
  notes?: string;
  status: string;
  transitTimeFromPrevious?: number;
  customizations?: Record<string, unknown>;
}

interface TimeBlock {
  start: Date;
  end: Date;
  type: 'meal' | 'activity';
  required: boolean;
}

// Constants
const MEAL_WINDOWS = {
  breakfast: {
    start: 9,
    end: 10.5,
    duration: 90,
    required: false, // Optional meal slot
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
};

const INTENSITY_WEIGHTS: Record<string, number> = {
  hiking: 90,
  sightseeing: 60,
  museum: 40,
  restaurant: 20,
  relaxation: 10,
};

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// Helper function to get all meal blocks for a day
function getReservedMealBlocks(activities: ItineraryActivity[], date: Date): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  const dayActivities = activities.filter(activity =>
    isSameDay(new Date(activity.startTime), date)
  );

  // Check each meal window
  Object.entries(MEAL_WINDOWS).forEach(([mealType, window]) => {
    const hasMeal = hasMealScheduled(dayActivities, mealType as 'breakfast' | 'lunch' | 'dinner');

    // For breakfast, also check if there's any activity scheduled
    if (mealType === 'breakfast') {
      const hasActivityDuringBreakfast = dayActivities.some(activity => {
        const activityHour = new Date(activity.startTime).getHours();
        return activityHour >= window.start && activityHour < window.end;
      });
      if (hasActivityDuringBreakfast) return;
    }

    // Only add block if no meal scheduled and (if breakfast, no activity scheduled)
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

function getDayBalance(activities: ItineraryActivity[], date: Date): DayBalance {
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
  activities: ItineraryActivity[],
  type: 'breakfast' | 'lunch' | 'dinner'
): boolean {
  const window = MEAL_WINDOWS[type];
  return activities.some(activity => {
    const time = new Date(activity.startTime).getHours();
    return (
      activity.recommendation.type === 'restaurant' && time >= window.start && time <= window.end
    );
  });
}

function calculateDayIntensity(activities: ItineraryActivity[]): number {
  if (activities.length === 0) return 0;

  const totalIntensity = activities.reduce((sum, activity) => {
    return sum + (INTENSITY_WEIGHTS[activity.recommendation.type] || 50);
  }, 0);

  return Math.round(totalIntensity / activities.length);
}

export function scoreTimeSlot(
  slot: Date,
  transitTime: number,
  dayActivities: ItineraryActivity[],
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
  } else {
    // If it's during breakfast time, small penalty for non-restaurant activities
    if (hour >= MEAL_WINDOWS.breakfast.start && hour < MEAL_WINDOWS.breakfast.end) {
      score -= 10; // Small penalty for using breakfast slot
    }
  }

  // Day balance factors
  const dayBalance = getDayBalance(dayActivities, slot);
  if (dayBalance.activityCount >= 4) score -= 20;
  if (dayBalance.intensity > 70) score -= 15;

  return score;
}

export function findAvailableSlots(
  activities: ItineraryActivity[],
  date: Date,
  duration: number,
  openingHours: OpeningHours,
  isRestaurant: boolean
): Date[] {
  const dayActivities = activities.filter(activity =>
    isSameDay(new Date(activity.startTime), date)
  );

  const slots: Date[] = [];
  const reservedBlocks = getReservedMealBlocks(activities, date);

  // For restaurants, prioritize meal times
  if (isRestaurant) {
    Object.entries(MEAL_WINDOWS).forEach(([mealType, window]) => {
      if (!hasMealScheduled(dayActivities, mealType as 'breakfast' | 'lunch' | 'dinner')) {
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

  // For regular activities
  let currentTime = new Date(date);
  currentTime.setHours(10, 0, 0, 0);
  const endTime = new Date(date);
  endTime.setHours(20, 0, 0, 0);

  // Combine activities and required meal blocks for gap finding
  const allBlocks = [
    ...reservedBlocks.filter(block => block.required),
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
      // Check if we can fit activity before end of day
      const potentialEndTime = addMinutes(currentTime, duration);
      if (
        potentialEndTime <= endTime &&
        isOpenAtTime(openingHours, currentTime) &&
        isOpenAtTime(openingHours, potentialEndTime)
      ) {
        slots.push(new Date(currentTime));
      }
      break;
    }

    const gap = nextBlock.start.getTime() - currentTime.getTime();
    const gapMinutes = gap / (1000 * 60);

    if (gapMinutes >= duration) {
      const potentialEndTime = addMinutes(currentTime, duration);
      if (isOpenAtTime(openingHours, currentTime) && isOpenAtTime(openingHours, potentialEndTime)) {
        slots.push(new Date(currentTime));
      }
    }

    currentTime = new Date(nextBlock.end);
  }

  // Add breakfast time as a potential slot for non-restaurants
  const breakfastBlock = reservedBlocks.find(
    block => !block.required && new Date(block.start).getHours() === MEAL_WINDOWS.breakfast.start
  );

  if (breakfastBlock && duration <= MEAL_WINDOWS.breakfast.duration) {
    if (isOpenAtTime(openingHours, breakfastBlock.start)) {
      slots.push(new Date(breakfastBlock.start));
    }
  }

  return slots;
}
