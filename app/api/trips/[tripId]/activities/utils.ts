import { OpeningHours } from '@googlemaps/google-maps-services-js';
import { ActivityRecommendation } from '@prisma/client';
import { addMinutes } from 'date-fns';

import { isOpenAtTime } from '@/lib/maps/utils';

interface MealWindow {
  start: number;
  end: number;
  type: 'breakfast' | 'lunch' | 'dinner';
}

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

// Constants
const MEAL_WINDOWS: MealWindow[] = [
  { start: 7, end: 10, type: 'breakfast' },
  { start: 11, end: 14, type: 'lunch' },
  { start: 17, end: 21, type: 'dinner' },
];

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
  const window = MEAL_WINDOWS.find(w => w.type === type);
  return activities.some(activity => {
    const time = new Date(activity.startTime).getHours();
    return (
      activity.recommendation.type === 'restaurant' && time >= window!.start && time <= window!.end
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
    const inMealWindow = MEAL_WINDOWS.some(window => hour >= window.start && hour <= window.end);
    if (!inMealWindow) score -= 30;
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

  // Morning slot if no activities
  if (dayActivities.length === 0) {
    const morningSlot = new Date(date);
    morningSlot.setHours(10, 0, 0, 0);
    if (isOpenAtTime(openingHours, morningSlot)) {
      slots.push(morningSlot);
    }
  }

  // Find gaps between activities
  let previousEndTime = new Date(date);
  previousEndTime.setHours(10, 0, 0, 0);

  for (const activity of dayActivities) {
    const activityStart = new Date(activity.startTime);
    const gap = (activityStart.getTime() - previousEndTime.getTime()) / (1000 * 60);

    if (gap >= duration) {
      const potentialSlot = new Date(previousEndTime);
      if (
        isOpenAtTime(openingHours, potentialSlot) &&
        isOpenAtTime(openingHours, addMinutes(potentialSlot, duration))
      ) {
        slots.push(potentialSlot);
      }
    }

    previousEndTime = new Date(activity.endTime);
  }

  // Add meal-specific slots if restaurant
  if (isRestaurant) {
    const appropriateMealWindows = MEAL_WINDOWS.filter(window => {
      const currentHour = new Date().getHours();
      // Only include upcoming meal times
      return window.start > currentHour;
    });

    for (const window of appropriateMealWindows) {
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
  }

  // End of day slot
  const lastEndTime = new Date(previousEndTime);
  if (lastEndTime.getHours() < 20) {
    if (
      isOpenAtTime(openingHours, lastEndTime) &&
      isOpenAtTime(openingHours, addMinutes(lastEndTime, duration))
    ) {
      slots.push(lastEndTime);
    }
  }

  return slots;
}
