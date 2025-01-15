import { protos } from '@googlemaps/places';
import { addMinutes, differenceInDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

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
  intervalTree: IntervalTree;
  timezone: string;
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

const getPreferredStartHour = (startTime: StartTime): number => {
  switch (startTime) {
    case 'early':
      return 7; // Early bird - 7am
    case 'mid':
      return 9; // Mid-morning - 9am
    case 'late':
      return 10; // Later start - 10am
    default:
      return 9; // Default to mid-morning if not specified
  }
};

function isSameDay(date1: Date | null, date2: Date | null, timezone: string): boolean {
  if (!date1 || !date2) return false;
  return (
    formatInTimeZone(date1, timezone, 'yyyy-MM-dd') ===
    formatInTimeZone(date2, timezone, 'yyyy-MM-dd')
  );
}

function getReservedMealBlocks(
  activities: ParsedItineraryActivity[],
  date: Date,
  timezone: string
): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  const dayActivities = activities.filter(activity =>
    activity.startTime ? isSameDay(new Date(activity.startTime), date, timezone) : false
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

function getDayBalance(
  activities: ParsedItineraryActivity[],
  date: Date,
  timezone: string
): DayBalance {
  const localDateStr = formatInTimeZone(date, timezone, 'yyyy-MM-dd');
  const dayActivities = activities.filter(activity =>
    activity.startTime
      ? formatInTimeZone(new Date(activity.startTime), timezone, 'yyyy-MM-dd') === localDateStr
      : false
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
  timezone: string,
  scoreAdjustment: number = 0
): number {
  // Add debug logging
  const isOpen = isActivityOpenDuring(
    { openingHours: { periods: recommendation.openingHours?.periods }, name: recommendation.name },
    slot,
    timezone
  );

  if (!isOpen) {
    return -Infinity;
  }

  let score = 100 + scoreAdjustment;
  const hour = Number(formatInTimeZone(slot, timezone, 'H'));

  // Check day balance - penalize days that already have many activities
  const dayBalance = getDayBalance(existingActivities, slot, timezone);

  // Strong penalty for unbalanced days
  score -= Math.max(0, (dayBalance.activityCount - 3) * 25);

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
    score += 15;
    if (isEveningVenue) {
      // Additional bonus for evening venues in their prime time
      score += 25;

      // Extra bonus for optimal hours (8 PM - 11 PM)
      if (hour >= 20 && hour <= 23) {
        score += 15;
      }
    }
  }

  if (recommendation.placeTypes.includes('art_gallery')) {
    const culturalActivitiesToday = existingActivities.filter(
      activity =>
        activity.startTime &&
        isSameDay(new Date(activity.startTime), slot, timezone) &&
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
        isSameDay(new Date(activity.startTime), slot, timezone) &&
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

function conflictsWithMeals(
  mealBlocks: TimeBlock[],
  startTime: Date,
  endTime: Date,
  timezone: string
): boolean {
  const localStart = formatInTimeZone(startTime, timezone, 'HH:mm');
  const localEnd = formatInTimeZone(endTime, timezone, 'HH:mm');

  return mealBlocks.some(block => {
    const blockStart = formatInTimeZone(block.start, timezone, 'HH:mm');
    const blockEnd = formatInTimeZone(block.end, timezone, 'HH:mm');

    return localStart <= blockEnd && localEnd >= blockStart;
  });
}

class Interval {
  constructor(
    public start: Date,
    public end: Date,
    public activity?: ParsedItineraryActivity
  ) {}

  overlaps(other: Interval): boolean {
    return this.start < other.end && this.end > other.start;
  }

  containsTime(time: Date): boolean {
    return time >= this.start && time < this.end;
  }
}

class IntervalTreeNode {
  public left: IntervalTreeNode | null = null;
  public right: IntervalTreeNode | null = null;
  public max: Date;

  constructor(
    public interval: Interval,
    public height: number = 1
  ) {
    this.max = interval.end;
  }
}

class IntervalTree {
  private root: IntervalTreeNode | null = null;

  insert(interval: Interval): void {
    this.root = this._insert(this.root, interval);
  }

  private _insert(node: IntervalTreeNode | null, interval: Interval): IntervalTreeNode {
    if (!node) {
      return new IntervalTreeNode(interval);
    }

    if (interval.start < node.interval.start) {
      node.left = this._insert(node.left, interval);
    } else {
      node.right = this._insert(node.right, interval);
    }

    // Update height and max
    node.height = 1 + Math.max(this.getHeight(node.left), this.getHeight(node.right));
    node.max = this.getMaxEnd(node);

    // Balance the tree
    return this.balance(node);
  }

  findOverlapping(interval: Interval): Interval[] {
    const result: Interval[] = [];
    this._findOverlapping(this.root, interval, result);
    return result;
  }

  private _findOverlapping(
    node: IntervalTreeNode | null,
    interval: Interval,
    result: Interval[]
  ): void {
    if (!node) return;

    // If current node's max is less than interval start, no overlaps possible
    if (node.max <= interval.start) return;

    // Check left subtree
    if (node.left && node.left.max > interval.start) {
      this._findOverlapping(node.left, interval, result);
    }

    // Check current node
    if (node.interval.overlaps(interval)) {
      result.push(node.interval);
    }

    // Check right subtree if needed
    if (node.right && node.interval.start < interval.end) {
      this._findOverlapping(node.right, interval, result);
    }
  }

  // Helper methods for AVL tree balancing
  private getHeight(node: IntervalTreeNode | null): number {
    return node ? node.height : 0;
  }

  private getMaxEnd(node: IntervalTreeNode): Date {
    const leftMax = node.left ? node.left.max : new Date(0);
    const rightMax = node.right ? node.right.max : new Date(0);
    return new Date(Math.max(node.interval.end.getTime(), leftMax.getTime(), rightMax.getTime()));
  }

  private balance(node: IntervalTreeNode): IntervalTreeNode {
    const balance = this.getHeight(node.left) - this.getHeight(node.right);

    if (balance > 1) {
      if (this.getHeight(node.left!.left) >= this.getHeight(node.left!.right)) {
        return this.rightRotate(node);
      } else {
        node.left = this.leftRotate(node.left!);
        return this.rightRotate(node);
      }
    }

    if (balance < -1) {
      if (this.getHeight(node.right!.right) >= this.getHeight(node.right!.left)) {
        return this.leftRotate(node);
      } else {
        node.right = this.rightRotate(node.right!);
        return this.leftRotate(node);
      }
    }

    return node;
  }

  private leftRotate(node: IntervalTreeNode): IntervalTreeNode {
    const rightChild = node.right!;
    const rightLeftChild = rightChild.left;

    rightChild.left = node;
    node.right = rightLeftChild;

    node.height = 1 + Math.max(this.getHeight(node.left), this.getHeight(node.right));
    rightChild.height =
      1 + Math.max(this.getHeight(rightChild.left), this.getHeight(rightChild.right));

    node.max = this.getMaxEnd(node);
    rightChild.max = this.getMaxEnd(rightChild);

    return rightChild;
  }

  private rightRotate(node: IntervalTreeNode): IntervalTreeNode {
    const leftChild = node.left!;
    const leftRightChild = leftChild.right;

    leftChild.right = node;
    node.left = leftRightChild;

    node.height = 1 + Math.max(this.getHeight(node.left), this.getHeight(node.right));
    leftChild.height =
      1 + Math.max(this.getHeight(leftChild.left), this.getHeight(leftChild.right));

    node.max = this.getMaxEnd(node);
    leftChild.max = this.getMaxEnd(leftChild);

    return leftChild;
  }
}

function hasActivityConflict(start: Date, end: Date, intervalTree: IntervalTree): boolean {
  const newInterval = new Interval(start, end);
  return intervalTree.findOverlapping(newInterval).length > 0;
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

function findAvailableSlots(
  activities: ParsedItineraryActivity[],
  date: Date,
  duration: number,
  openingHours: protos.google.maps.places.v1.Place.IOpeningHours | null | undefined,
  isRestaurant: boolean,
  tripStart: Date,
  tripEnd: Date,
  timezone: string
): Date[] {
  const slots: Date[] = [];
  const periods = openingHours?.periods || [];

  // Early return if the date is outside trip bounds
  if (date < tripStart || date > tripEnd) {
    return slots;
  }

  // Build interval tree for existing activities
  const intervalTree = new IntervalTree();
  activities.forEach(activity => {
    if (activity.startTime && activity.endTime) {
      intervalTree.insert(new Interval(new Date(activity.startTime), new Date(activity.endTime)));
    }
  });

  const dayPeriods = periods.filter(period => {
    if (!period?.open) return false;
    const localDay = Number(formatInTimeZone(date, timezone, 'e')) - 1;
    return period.open.day === localDay;
  });

  // Handle restaurants separately
  if (isRestaurant) {
    return handleRestaurantSlots(
      date,
      duration,
      dayPeriods,
      activities,
      tripStart,
      tripEnd,
      MEAL_WINDOWS
    );
  }

  // For non-restaurant activities, generate slots every 30 minutes during opening hours
  dayPeriods.forEach(period => {
    if (!period?.open || !period?.close) return;

    const startHour = period.open.hour || 0;
    const startMinute = period.open.minute || 0;
    const endHour = period.close.hour || 23;
    const endMinute = period.close.minute || 59;

    let currentTime = new Date(date);
    currentTime.setHours(startHour, startMinute, 0, 0);

    const periodEnd = new Date(date);
    if (period.close.day !== period.open.day) {
      periodEnd.setDate(periodEnd.getDate() + 1);
    }
    periodEnd.setHours(endHour, endMinute, 0, 0);

    while (currentTime <= periodEnd) {
      const slotEnd = addMinutes(currentTime, duration);
      if (
        currentTime >= tripStart &&
        slotEnd <= tripEnd &&
        !hasActivityConflict(currentTime, slotEnd, intervalTree)
      ) {
        slots.push(new Date(currentTime));
      }
      currentTime = addMinutes(currentTime, 30);
    }
  });

  return slots;
}

// Calculate total available time in the trip
function calculateAvailableTime(trip: Pick<ParsedTrip, 'endDate' | 'startDate'>): number {
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);

  // Calculate full days
  const days = differenceInDays(endDate, startDate) + 1;

  // Assume 10 hours per day of activity time (8AM - 6PM)
  // This accounts for travel time, breaks, etc.
  const HOURS_PER_DAY = 10;

  return days * HOURS_PER_DAY * 60; // Return total minutes available
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
      warning: null,
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
  const activityIntervals = new IntervalTree();

  const sortedActivities = activities.sort((a, b) => {
    // Start with planned activities
    if (a.status !== b.status) {
      return a.status === 'planned' ? -1 : 1;
    }
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
        sortedActivities,
        userPreferences,
        activityIntervals
      );

      if (!bestSlot) {
        console.warn(`Could not find valid slot for activity ${activity.id}`);
        unscheduledActivities.push(activity);
        continue;
      }

      const endTime = addMinutes(bestSlot, activity.recommendation.duration);

      // Add the scheduled activity to the interval tree
      activityIntervals.insert(new Interval(bestSlot, endTime, activity));

      await prisma.itineraryActivity.update({
        where: { id: activity.id },
        data: {
          startTime: bestSlot,
          endTime,
          transitTimeFromPrevious: bestTransitTime,
        },
      });

      const updatedActivity = {
        ...activity,
        startTime: bestSlot,
        endTime,
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
  userPreferences: UserPreferences,
  activityIntervals: IntervalTree
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

  const isRestaurant = recommendation.placeTypes.includes('restaurant');

  while (currentDate <= tripEnd) {
    const availableSlots = findAvailableSlots(
      existingActivities,
      currentDate,
      recommendation.duration,
      recommendation.openingHours,
      isRestaurant,
      tripStart,
      tripEnd,
      trip.city.timezone
    );

    // If no slots available, we should skip to next day
    if (availableSlots.length === 0) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(getPreferredStartHour(userPreferences.preferredStartTime), 0, 0, 0);
      continue;
    }

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
      nextDay.setHours(2, 0, 0, 0); // Allow scheduling until 2 AM
      endTime = nextDay;
    }

    for (const slot of availableSlots) {
      const previousActivity = existingActivities
        .filter(a => {
          if (!a.endTime) return false;
          const endTime = new Date(a.endTime);
          return (
            endTime <= slot && endTime >= tripStart && isSameDay(endTime, slot, trip.city.timezone)
          );
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
        : 0;

      const validation = await validateActivityTimeSlot({
        startTime: slot,
        duration: recommendation.duration,
        tripStart,
        tripEnd,
        previousActivity,
        existingActivities,
        transitTime,
        intervalTree: activityIntervals,
        timezone: trip.city.timezone,
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
        userPreferences,
        trip.city.timezone,
        validation.scoreAdjustment
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
  intervalTree,
  timezone,
}: ValidateTimeSlotParams): Promise<ValidationResult> {
  if (!startTime) {
    return { isValid: false, reason: 'No start time provided' };
  }

  // Add early check for 2 AM cutoff
  const hour = Number(formatInTimeZone(startTime, timezone, 'H'));
  if (hour >= 2 && hour < 6) {
    return {
      isValid: false,
      reason: 'Activities cannot be scheduled between 2 AM and 6 AM',
    };
  }

  // Include transit time in total duration
  const totalDuration = duration + transitTime + BUFFER_TIME_MINUTES;
  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + totalDuration);

  // Adjust end time validation for evening venues that go past midnight
  const adjustedTripEnd = new Date(tripEnd);
  if (startTime.getHours() >= 19) {
    adjustedTripEnd.setDate(adjustedTripEnd.getDate() + 1);
    adjustedTripEnd.setHours(2, 0, 0, 0);
  }

  if (startTime < tripStart || endTime > adjustedTripEnd) {
    return {
      isValid: false,
      reason: 'Activity falls outside trip dates',
    };
  }

  // Strengthen transit time check
  if (previousActivity?.endTime) {
    const previousEndTime = new Date(previousActivity.endTime);
    const minimumStartTime = new Date(previousEndTime);
    minimumStartTime.setMinutes(minimumStartTime.getMinutes() + transitTime + BUFFER_TIME_MINUTES);

    if (startTime <= minimumStartTime) {
      // Changed from < to <= to prevent exact same time scheduling
      return {
        isValid: false,
        reason: `Insufficient transit time from previous activity (needs ${transitTime + BUFFER_TIME_MINUTES} minutes)`,
      };
    }
  }

  // Also check for any activities that end right before this one
  const previousEndingActivities = existingActivities.filter(activity => {
    if (!activity.endTime) return false;
    const activityEnd = new Date(activity.endTime);
    return activityEnd <= startTime && isSameDay(activityEnd, startTime, timezone);
  });

  if (previousEndingActivities.length > 0) {
    const lastEndingActivity = previousEndingActivities.reduce((latest, current) => {
      if (!latest.endTime || !current.endTime) return current;
      return new Date(latest.endTime) > new Date(current.endTime) ? latest : current;
    });

    if (lastEndingActivity.endTime) {
      const lastEnd = new Date(lastEndingActivity.endTime);
      const minimumGap = transitTime + BUFFER_TIME_MINUTES;
      const actualGap = (startTime.getTime() - lastEnd.getTime()) / (1000 * 60); // Convert to minutes

      if (actualGap < minimumGap) {
        return {
          isValid: false,
          reason: `Need at least ${minimumGap} minutes between activities (currently ${Math.floor(actualGap)} minutes)`,
        };
      }
    }
  }

  // Rest of the validation remains the same...
  const hasConflict = hasActivityConflict(startTime, endTime, intervalTree);

  if (hasConflict) {
    return {
      isValid: false,
      reason: 'Time slot conflicts with existing activity',
    };
  }

  const mealtimeConflict = conflictsWithMeals(
    getReservedMealBlocks(existingActivities, startTime, timezone),
    startTime,
    endTime,
    timezone
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

export function isActivityOpenDuring(
  recommendation: {
    openingHours: {
      periods: protos.google.maps.places.v1.Place.IOpeningHours['periods'];
    };
    name: string;
  },
  startTime: Date,
  timezone: string
): boolean {
  const periods = recommendation.openingHours.periods;

  if (!periods?.length) {
    console.debug(`No opening hours found for ${recommendation.name}`);
    return false;
  }

  const localTimeStr = formatInTimeZone(startTime, timezone, 'HH:mm:ss E');
  const [timeStr, dayStr] = localTimeStr.split(' ');
  const [hours, minutes] = timeStr.split(':').map(Number);
  const activityStartDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(dayStr);
  const activityStartMinutes = hours * 60 + minutes;

  return periods.some(period => {
    if (
      !period.open ||
      typeof period.open.day !== 'number' ||
      typeof period.open.hour !== 'number' ||
      !period.close ||
      typeof period.close.day !== 'number' ||
      typeof period.close.hour !== 'number'
    ) {
      return false;
    }

    const openDay = period.open.day;
    const openMinutes = period.open.hour * 60 + (period.open.minute || 0);
    const closeDay = period.close.day;
    const closeMinutes = period.close.hour * 60 + (period.close.minute || 0);

    // Handle overnight periods
    if (openDay === activityStartDay) {
      // Opens on current day - check if after opening time
      return activityStartMinutes >= openMinutes;
    } else if (closeDay === activityStartDay) {
      // Closes on current day - check if before closing time
      return activityStartMinutes <= closeMinutes;
    } else if (openDay === (activityStartDay + 6) % 7) {
      // Previous day's overnight period
      return activityStartMinutes <= closeMinutes;
    }

    return false;
  });
}

export function getNextOpeningTime(
  openingHours: { periods: protos.google.maps.places.v1.Place.IOpeningHours['periods'] },
  currentTime: Date,
  timezone: string
): Date | null {
  const periods = openingHours.periods;
  if (!periods?.length) return null;

  // Get local time components
  const localTimeStr = formatInTimeZone(currentTime, timezone, 'HH:mm:ss E');
  const [timeStr, dayStr] = localTimeStr.split(' ');
  const [hours, minutes] = timeStr.split(':').map(Number);
  const currentDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(dayStr);
  const currentMinutes = hours * 60 + minutes;

  // Look for the next opening time within the next 7 days
  for (let daysAhead = 0; daysAhead < 7; daysAhead++) {
    const checkDay = (currentDay + daysAhead) % 7;

    // Get all periods for this day
    const dayPeriods = periods.filter(period => {
      if (!period.open || typeof period.open.day !== 'number') return false;
      return period.open.day === checkDay;
    });

    for (const period of dayPeriods) {
      if (
        !period.open ||
        typeof period.open.day !== 'number' ||
        typeof period.open.hour !== 'number'
      ) {
        continue;
      }

      const openMinutes = period.open.hour * 60 + (period.open.minute || 0);

      // If we're checking the current day, only consider future times
      if (daysAhead === 0 && openMinutes <= currentMinutes) {
        continue;
      }

      // Create the next opening time
      const nextOpeningTime = new Date(currentTime);
      nextOpeningTime.setDate(nextOpeningTime.getDate() + daysAhead);
      nextOpeningTime.setHours(period.open.hour);
      nextOpeningTime.setMinutes(period.open.minute || 0);

      return nextOpeningTime;
    }
  }

  return null;
}

export function isTimeWithinPeriod(
  time: Date,
  period: protos.google.maps.places.v1.Place.OpeningHours.IPeriod,
  timezone: string
): boolean {
  if (
    !period?.open ||
    typeof period.open.day !== 'number' ||
    typeof period.open.hour !== 'number'
  ) {
    return false;
  }

  const localTimeStr = formatInTimeZone(time, timezone, 'HH:mm:ss E');
  const [timeStr] = localTimeStr.split(' ');
  const [hours, minutes] = timeStr.split(':').map(Number);
  const timeMinutes = hours * 60 + minutes;

  const openMinutes = period.open.hour * 60 + (period.open.minute || 0);

  return timeMinutes >= openMinutes;
}
