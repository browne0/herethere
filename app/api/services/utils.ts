import { protos } from '@googlemaps/places';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

import { ParsedItineraryActivity } from '@/app/trips/[tripId]/types';
import {
  CategoryMapping,
  GOOGLE_RESTAURANT_TYPES,
  PLACE_INDICATORS,
  PlaceCategory,
} from '@/constants';
import { prisma } from '@/lib/db';

interface TimeSlot {
  start: Date;
  end: Date;
  type: 'morning' | 'afternoon' | 'evening' | 'meal';
}

const TIME_SLOTS = {
  morning: { start: '09:00', end: '12:00' },
  afternoon: { start: '13:00', end: '17:00' },
  evening: { start: '19:30', end: '23:00' },
};

const MEAL_TIMES = {
  breakfast: {
    start: '8:00',
    end: '11:30',
    duration: 60,
  },
  lunch: {
    start: '11:30',
    end: '16:00',
    duration: 60,
  },
  dinner: {
    start: '17:00',
    end: '22:00',
    duration: 60,
  },
};
const SCORING_WEIGHTS = {
  transitTime: 0.3, // How important is minimizing transit time
  timeOfDay: 0.2, // How important is scheduling at appropriate times
  popularity: 0.1, // How important is prioritizing popular activities
  clustering: 0.15, // How important is keeping similar activities together
  timeSlotUsage: 0.25, // How important is efficient use of time slots
};

const TIME_PREFERENCES = {
  // Cultural venues - best experienced when fresh and less crowded
  museum: { morning: 1.0, afternoon: 0.8, evening: 0.3 },

  // Outdoor activities - best with good daylight and weather
  park: { morning: 0.9, afternoon: 1.0, evening: 0.6 },
  beach: { morning: 0.8, afternoon: 1.0, evening: 0.7 },

  // Dining and entertainment
  restaurant: { morning: 0.7, afternoon: 0.9, evening: 1.0 },
  nightlife: { morning: 0.1, afternoon: 0.4, evening: 1.0 },

  // Shopping and markets
  // shopping: { morning: 0.8, afternoon: 1.0, evening: 0.7 },

  // Tourist attractions
  attraction: { morning: 1.0, afternoon: 0.9, evening: 0.7 },
  historic: { morning: 0.9, afternoon: 1.0, evening: 0.8 },

  // Wellness activities
  spa: { morning: 0.9, afternoon: 0.5, evening: 0 },

  // Default for uncategorized activities
  default: { morning: 0.8, afternoon: 1.0, evening: 0.7 },
};

interface PlacementScore {
  score: number;
  startTime: Date;
  endTime: Date;
  transitTime: number;
  breakdown: {
    transitScore: number;
    timeOfDayScore: number;
    popularityScore: number;
    clusteringScore: number;
    timeSlotScore: number;
  };
}

export function scheduleActivities(
  activities: ParsedItineraryActivity[],
  startDate: Date,
  endDate: Date,
  timezone: string
): ParsedItineraryActivity[] {
  // First, create all activities without times
  const unscheduledActivities: ParsedItineraryActivity[] = activities.map(activity => ({
    ...activity,
    startTime: null,
    endTime: null,
    transitTimeFromPrevious: 0,
  }));

  // Separate restaurants from other activities
  const restaurants = unscheduledActivities.filter(activity =>
    activity.recommendation.placeTypes.some(type => GOOGLE_RESTAURANT_TYPES.includes(type))
  );

  const otherActivities = unscheduledActivities.filter(
    activity =>
      !activity.recommendation.placeTypes.some(type => GOOGLE_RESTAURANT_TYPES.includes(type))
  );

  const scheduledActivities: ParsedItineraryActivity[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    // Schedule meals first
    scheduledActivities.push(
      ...scheduleMeals(restaurants, currentDate, scheduledActivities, timezone)
    );

    // Schedule other activities around meals
    const timeSlots = generateTimeSlots(currentDate, timezone);

    // For each unscheduled activity, find and score possible placements
    for (const activity of otherActivities) {
      if (isActivityScheduled(activity, scheduledActivities)) continue;

      let bestPlacement: PlacementScore | null = null;

      // Try each time slot
      for (const slot of timeSlots) {
        // Generate potential start times within the slot (e.g., every 30 minutes)
        const startTimes = generatePotentialStartTimes(slot, 30);

        for (const potentialStart of startTimes) {
          const lastActivityOfDay =
            scheduledActivities.length > 0
              ? scheduledActivities
                  .filter(
                    a =>
                      a.startTime &&
                      a.endTime &&
                      a.startTime.toDateString() === potentialStart.toDateString() &&
                      a.endTime.toDateString() === potentialStart.toDateString()
                  )
                  .slice(-1)[0]
              : null;

          const transitTime = lastActivityOfDay
            ? calculateTransitTime(
                lastActivityOfDay.recommendation.location,
                activity.recommendation.location
              )
            : 0;

          const adjustedStart = new Date(potentialStart);
          adjustedStart.setMinutes(adjustedStart.getMinutes() + transitTime);

          const minutes = adjustedStart.getMinutes();
          const roundedMinutes = Math.ceil(minutes / 30) * 30;
          adjustedStart.setMinutes(roundedMinutes, 0, 0);

          const potentialEnd = new Date(adjustedStart);
          potentialEnd.setMinutes(potentialEnd.getMinutes() + activity.recommendation.duration);

          // Check if this placement is valid
          if (
            adjustedStart <= slot.end &&
            !overlapsWithScheduledActivities(
              adjustedStart,
              potentialEnd,
              scheduledActivities,
              activity.recommendation.location
            ) &&
            canScheduleActivity(
              activity,
              { ...slot, start: adjustedStart, end: potentialEnd },
              timezone
            )
          ) {
            // Score this placement
            const placementScore = scoreActivityPlacement(
              activity,
              adjustedStart,
              potentialEnd,
              transitTime,
              scheduledActivities
            );

            // Update best placement if this is better
            if (!bestPlacement || placementScore.score > bestPlacement.score) {
              bestPlacement = placementScore;
            }
          }
        }
      }

      // Schedule activity at its best placement if found
      if (bestPlacement) {
        scheduledActivities.push({
          ...activity,
          startTime: bestPlacement.startTime,
          endTime: bestPlacement.endTime,
          transitTimeFromPrevious: bestPlacement.transitTime,
        });
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  const unscheduledForDay = otherActivities.filter(
    activity => !isActivityScheduled(activity, scheduledActivities)
  );

  scheduledActivities.push(
    ...unscheduledForDay.map(activity => {
      return {
        ...activity,
        startTime: null,
        endTime: null,
        transitTimeFromPrevious: 0,
      };
    })
  );

  return scheduledActivities.sort((a, b) => {
    if (a.startTime === null && b.startTime === null) return 0;
    if (a.startTime === null) return 1;
    if (b.startTime === null) return -1;
    return a.startTime.getTime() - b.startTime.getTime();
  });
}

function isActivityScheduled(
  activity: ParsedItineraryActivity,
  scheduledActivities: ParsedItineraryActivity[]
): boolean {
  return scheduledActivities.some(scheduled => scheduled.id === activity.id);
}

function overlapsWithScheduledActivities(
  startTime: Date,
  endTime: Date,
  scheduledActivities: ParsedItineraryActivity[],
  newActivityLocation: { latitude: number; longitude: number }
): boolean {
  return scheduledActivities.some(activity => {
    if (!activity.startTime || !activity.endTime) return false;

    // Check if this activity is BEFORE the new activity
    if (activity.endTime <= startTime) {
      // Get the transit time needed after the existing activity
      const transitAfterExisting = calculateTransitTime(
        activity.recommendation.location,
        newActivityLocation
      );

      // Calculate the earliest possible start time after this activity
      const earliestPossibleStart = new Date(
        activity.endTime.getTime() + transitAfterExisting * 60 * 1000
      );

      // Check if we're trying to start before we can get there
      if (startTime < earliestPossibleStart) {
        return true; // Overlap - can't start before transit time allows
      }
    }

    // Check if this activity is AFTER the new activity
    if (activity.startTime >= endTime) {
      // Get the transit time needed to get to the next activity
      const transitToNext = calculateTransitTime(
        newActivityLocation,
        activity.recommendation.location
      );

      // Calculate the latest possible end time to make it to the next activity
      const latestPossibleEnd = new Date(activity.startTime.getTime() - transitToNext * 60 * 1000);

      // Check if we're trying to end too late to make it to the next activity
      if (endTime > latestPossibleEnd) {
        return true; // Overlap - would make next activity unreachable
      }
    }

    // Check for direct time overlap
    if (!(endTime <= activity.startTime || startTime >= activity.endTime)) {
      return true; // Direct time overlap
    }

    return false; // No overlap found
  });
}

function findClosestRestaurant(
  location: { latitude: number; longitude: number },
  restaurants: ParsedItineraryActivity[]
): ParsedItineraryActivity {
  return restaurants.reduce((closest, current) => {
    const closestDistance = calculateTransitTime(location, closest.recommendation.location);
    const currentDistance = calculateTransitTime(location, current.recommendation.location);
    return currentDistance < closestDistance ? current : closest;
  }, restaurants[0]);
}

function scheduleMeals(
  restaurants: ParsedItineraryActivity[],
  date: Date,
  scheduledActivities: ParsedItineraryActivity[],
  timezone: string
): ParsedItineraryActivity[] {
  const meals: ParsedItineraryActivity[] = [];

  for (const [_, time] of Object.entries(MEAL_TIMES)) {
    const mealStart = new Date(date);
    const [startHour, startMinute] = time.start.split(':');
    mealStart.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);

    // Find suitable restaurant for this meal
    const availableRestaurants = restaurants.filter(
      restaurant =>
        !isActivityScheduled(restaurant, [...scheduledActivities, ...meals]) &&
        canScheduleActivity(
          restaurant,
          {
            start: mealStart,
            end: new Date(mealStart.getTime() + time.duration * 60000),
            type: 'meal',
          },
          timezone
        )
    );

    if (availableRestaurants.length > 0) {
      // Select restaurant closest to previous activity if exists
      const previousActivity = [...scheduledActivities, ...meals].slice(-1)[0];
      const selectedRestaurant = previousActivity
        ? findClosestRestaurant(previousActivity.recommendation.location, availableRestaurants)
        : availableRestaurants[0];

      const transitTime = previousActivity
        ? calculateTransitTime(
            previousActivity.recommendation.location,
            selectedRestaurant.recommendation.location
          )
        : 0;

      const startTime = new Date(mealStart);

      // Add transit time and round up to next 30 minutes
      startTime.setMinutes(startTime.getMinutes() + transitTime);
      const minutes = startTime.getMinutes();
      const roundedMinutes = Math.ceil(minutes / 30) * 30;
      startTime.setMinutes(roundedMinutes, 0, 0);

      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + selectedRestaurant.recommendation.duration);

      meals.push({
        ...selectedRestaurant,
        startTime,
        endTime,
        transitTimeFromPrevious: transitTime,
      });
    }
  }

  return meals;
}

function generateTimeSlots(date: Date, timezone: string): TimeSlot[] {
  return Object.entries(TIME_SLOTS).map(([type, times]) => {
    const start = new Date(date);
    const [startHour, startMinute] = times.start.split(':');

    // Convert to timezone-aware time
    const zonedStart = toZonedTime(start, timezone);
    zonedStart.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);

    const end = new Date(date);
    const [endHour, endMinute] = times.end.split(':');

    // Convert to timezone-aware time
    const zonedEnd = toZonedTime(end, timezone);
    zonedEnd.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);

    return {
      start: zonedStart,
      end: zonedEnd,
      type: type as 'morning' | 'afternoon' | 'evening',
    };
  });
}

function canScheduleActivity(
  activity: ParsedItineraryActivity,
  slot: TimeSlot,
  timezone: string
): boolean {
  if (!activity.recommendation.openingHours || !activity.recommendation.openingHours.periods)
    return false;

  const localDayOfWeek =
    parseInt(
      formatInTimeZone(slot.start, timezone, 'e') // 'e' returns 0-6 for day of week
    ) - 1;

  // Check if the place is 24/7 first
  const is24_7 =
    activity.recommendation.openingHours.periods.length === 1 &&
    activity.recommendation.openingHours.periods[0].open &&
    !activity.recommendation.openingHours.periods[0].close;

  const periodsForDay = is24_7
    ? activity.recommendation.openingHours.periods // For 24/7, use the single period
    : activity.recommendation.openingHours.periods.filter(period => {
        if (!isValidPoint(period.open)) return false;
        return period.open.day === localDayOfWeek;
      });

  if (periodsForDay.length === 0) {
    return false; // Place is closed this day
  }

  return periodsForDay.some(period => {
    const open = period.open!;

    const openingTime = new Date(slot.start);
    openingTime.setHours(open!.hour!, open!.minute!, 0, 0);
    let closingTime: Date;

    if (isValidPoint(period.close)) {
      // Has valid closing time
      closingTime = new Date(slot.start);
      if (period.close.day !== open.day) {
        closingTime.setDate(closingTime.getDate() + 1);
      }
      closingTime.setHours(period.close.hour!, period.close.minute!, 0, 0);
    } else {
      // Handle 24/7 case
      closingTime = new Date(openingTime);
      closingTime.setDate(closingTime.getDate() + 1);
    }

    // Compare times in local timezone
    const slotStartLocal = toZonedTime(slot.start, timezone);
    const slotEndLocal = toZonedTime(slot.end, timezone);
    const openTimeLocal = toZonedTime(openingTime, timezone);
    const closeTimeLocal = toZonedTime(closingTime, timezone);

    return slotStartLocal >= openTimeLocal && slotEndLocal <= closeTimeLocal;
  });
}

function calculateTransitTime(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): number {
  // Simple distance-based calculation
  // In a real implementation, you'd want to use a routing service
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (from.latitude * Math.PI) / 180;
  const φ2 = (to.latitude * Math.PI) / 180;
  const Δφ = ((to.latitude - from.latitude) * Math.PI) / 180;
  const Δλ = ((to.longitude - from.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Rough estimate: 4km/h walking speed
  return Math.round(distance / (4000 / 60)); // Returns minutes
}

function isValidPoint(
  point: protos.google.maps.places.v1.Place.OpeningHours.Period.IPoint | null | undefined
): point is protos.google.maps.places.v1.Place.OpeningHours.Period.IPoint {
  if (!point) return false;

  const { day, hour, minute } = point;
  return (
    day !== undefined &&
    day !== null &&
    hour !== undefined &&
    hour !== null &&
    minute !== undefined &&
    minute !== null
  );
}

export function isTimeWithinPeriod(
  time: Date,
  period: protos.google.maps.places.v1.Place.OpeningHours.IPeriod,
  timezone: string
): boolean {
  if (!isValidPoint(period.open)) {
    return false;
  }

  const zonedTime = toZonedTime(time, timezone);
  const openingTime = new Date(zonedTime);
  openingTime.setHours(period.open.hour!, period.open.minute || 0, 0, 0);

  return zonedTime >= openingTime;
}

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

function scoreActivityPlacement(
  activity: ParsedItineraryActivity,
  startTime: Date,
  endTime: Date,
  transitTime: number,
  scheduledActivities: ParsedItineraryActivity[]
): PlacementScore {
  // First check if the placement is valid considering transit times
  if (
    overlapsWithScheduledActivities(
      startTime,
      endTime,
      scheduledActivities,
      activity.recommendation.location
    )
  ) {
    return {
      score: -1,
      startTime,
      endTime,
      transitTime,
      breakdown: {
        transitScore: 0,
        timeOfDayScore: 0,
        popularityScore: 0,
        clusteringScore: 0,
        timeSlotScore: 0,
      },
    };
  }

  // 1. Transit time score (lower is better)
  const maxTransitTime = 60; // Maximum expected transit time in minutes
  const transitScore = 1 - Math.min(transitTime / maxTransitTime, 1);

  // 2. Time of day appropriateness score
  const timeOfDay = getTimeOfDay(startTime);
  const activityType = determineActivityType(activity);
  const timeOfDayScore = TIME_PREFERENCES[activityType as keyof typeof TIME_PREFERENCES][timeOfDay];

  // 3. Popularity score based on rating and review count
  const popularityScore = calculatePopularityScore(activity);

  // 4. Clustering score - how well it fits with nearby activities
  const clusteringScore = calculateClusteringScore(activity, startTime, scheduledActivities);

  // 5. Time slot usage score - how efficiently it uses the available slot
  const timeSlotScore = calculateTimeSlotUsage(
    startTime,
    endTime,
    activity.recommendation.duration
  );

  // Calculate weighted total score
  const totalScore =
    transitScore * SCORING_WEIGHTS.transitTime +
    timeOfDayScore * SCORING_WEIGHTS.timeOfDay +
    popularityScore * SCORING_WEIGHTS.popularity +
    clusteringScore * SCORING_WEIGHTS.clustering +
    timeSlotScore * SCORING_WEIGHTS.timeSlotUsage;

  return {
    score: totalScore,
    startTime,
    endTime,
    transitTime,
    breakdown: {
      transitScore,
      timeOfDayScore,
      popularityScore,
      clusteringScore,
      timeSlotScore,
    },
  };
}

function determineActivityType(activity: ParsedItineraryActivity): string {
  const types = activity.recommendation.placeTypes;
  const description = activity.recommendation.description?.toLowerCase() ?? '';

  // Museum and cultural venues
  if (types.some(type => CategoryMapping[PlaceCategory.MUSEUM].includedTypes.includes(type))) {
    return 'museum';
  }

  // Outdoor spaces
  if (types.some(type => CategoryMapping[PlaceCategory.PARK].includedTypes.includes(type))) {
    return 'park';
  }
  if (types.some(type => CategoryMapping[PlaceCategory.BEACH].includedTypes.includes(type))) {
    return 'beach';
  }

  // Dining and entertainment
  if (
    types.some(type => CategoryMapping[PlaceCategory.RESTAURANT].includedTypes.includes(type)) &&
    !types.some(type => CategoryMapping[PlaceCategory.RESTAURANT].excludedTypes.includes(type))
  ) {
    return 'restaurant';
  }

  if (types.some(type => CategoryMapping[PlaceCategory.NIGHTLIFE].includedTypes.includes(type))) {
    return 'nightlife';
  }

  // Shopping
  // if (
  //   types.includes('shopping_mall') ||
  //   types.includes('shopping_center') ||
  //   types.includes('market')
  // ) {
  //   return 'shopping';
  // }

  // Wellness
  if (types.some(type => CategoryMapping[PlaceCategory.SPA].includedTypes.includes(type))) {
    return 'spa';
  }

  // Historic sites and attractions
  if (
    types.some(type => CategoryMapping[PlaceCategory.HISTORIC].includedTypes.includes(type)) ||
    PLACE_INDICATORS.HISTORICAL.TIME_PERIODS.has(description) ||
    PLACE_INDICATORS.HISTORICAL.ARCHITECTURAL.has(description)
  ) {
    return 'historic';
  }

  // General tourist attractions
  if (types.some(type => CategoryMapping[PlaceCategory.ATTRACTION].includedTypes.includes(type))) {
    return 'attraction';
  }

  // Default fallback
  return 'default';
}

function getTimeOfDay(time: Date): 'morning' | 'afternoon' | 'evening' {
  const hour = time.getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function calculatePopularityScore(activity: ParsedItineraryActivity): number {
  const { rating, reviewCount } = activity.recommendation;
  const normalizedRating = (rating - 3) / 2; // Convert 3-5 scale to 0-1
  const normalizedReviews = Math.min(reviewCount / 1000, 1); // Cap at 1000 reviews
  return (normalizedRating + normalizedReviews) / 2;
}

function calculateClusteringScore(
  activity: ParsedItineraryActivity,
  startTime: Date,
  scheduledActivities: ParsedItineraryActivity[]
): number {
  const nearbyActivities = scheduledActivities.filter(scheduled => {
    if (!scheduled.startTime) return false;
    const timeDiff = Math.abs(startTime.getTime() - scheduled.startTime.getTime());
    return timeDiff <= 3 * 60 * 60 * 1000; // Within 3 hours
  });

  if (nearbyActivities.length === 0) return 0.5; // Neutral score if no nearby activities

  const similarityScores = nearbyActivities.map(nearby => {
    const typesSimilarity = calculateTypesSimilarity(
      activity.recommendation.placeTypes,
      nearby.recommendation.placeTypes
    );
    const timeProximity = calculateTimeProximity(startTime, nearby.startTime!);
    return (typesSimilarity + timeProximity) / 2;
  });

  return similarityScores.reduce((sum, score) => sum + score, 0) / similarityScores.length;
}

function calculateTypesSimilarity(types1: string[], types2: string[]): number {
  const commonTypes = types1.filter(type => types2.includes(type));
  return commonTypes.length / Math.max(types1.length, types2.length);
}

function calculateTimeProximity(time1: Date, time2: Date): number {
  const hoursDiff = Math.abs(time1.getTime() - time2.getTime()) / (60 * 60 * 1000);
  return Math.max(0, 1 - hoursDiff / 3); // Linear decay over 3 hours
}

function calculateTimeSlotUsage(startTime: Date, endTime: Date, duration: number): number {
  const actualDuration = (endTime.getTime() - startTime.getTime()) / (60 * 1000);
  const efficiency = duration / actualDuration;
  return Math.min(efficiency, 1); // Cap at 1 for perfect usage
}

function generatePotentialStartTimes(slot: TimeSlot, intervalMinutes: number): Date[] {
  const startTimes: Date[] = [];
  const current = new Date(slot.start);

  while (current < slot.end) {
    startTimes.push(new Date(current));
    current.setMinutes(current.getMinutes() + intervalMinutes);
  }

  return startTimes;
}
