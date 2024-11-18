import { City, TripPreferences } from '../types';
import { ACTIVITY_CATEGORIES } from '../types/activities';

export function generatePrompt(
  cityData: City,
  preferences: TripPreferences,
  tripTimeZone: string
): string {
  if (!preferences.dates?.from || !preferences.dates?.to) {
    throw new Error('Missing trip dates');
  }
  const days =
    Math.ceil(
      (new Date(preferences.dates.to).getTime() - new Date(preferences.dates.from).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;

  const tripStyle =
    preferences.tripVibe > 75 ? 'Adventurous' : preferences.tripVibe > 25 ? 'Balanced' : 'Relaxed';

  const activitiesPerDay =
    preferences.tripVibe > 75
      ? 6 // Adventurous
      : preferences.tripVibe > 25
        ? 5 // Balanced
        : 4; // Relaxed

  return `Create a ${days}-day ${cityData.name} itinerary using timezone: ${tripTimeZone}.

  STRICT REQUIREMENTS:
  1. Location Requirements:
     - ALL activities MUST be located IN ${cityData.name} proper
     - NO activities in other cities or countries
     - ALL places MUST be verifiable on Google Maps
  
  2. Activity Count and Scheduling:
     - EXACTLY ${activitiesPerDay} activities per day, no more and no less
     - Activities MUST NOT overlap in time
     - MANDATORY 30-minute MINIMUM gap between activities
     - One meal activity MUST be scheduled during local meal times
     - First activity starts at or after 09:00 ${tripTimeZone}
     - Last activity ends at or before 22:00 ${tripTimeZone}
  
  For each activity, include:
  1. Name (use official, findable place names)
  2. Category (one of: ${Object.values(ACTIVITY_CATEGORIES)
    .map(cat => cat.id)
    .join(', ')})
  3. Complete address as it appears on Google Maps
  4. Day number (1 = first day, 2 = second day, etc.)
  5. Start and end times (ISO 8601 with timezone offset)
  6. Brief description/notes
  7. Price level (1-4)

  Time Format Requirements:
  - ALL times MUST be in ISO 8601 format with timezone offset
  - Example for ${cityData.name}: 2024-03-15T14:30:00${
    tripTimeZone.includes('Asia/Tokyo') ? '+09:00' : '+00:00'
  }
  - VERIFY that each activity's start time is after previous activity's end time + 30 minutes
  - VERIFY that no activities overlap in time

  Trip Details:
  - Budget Level: ${preferences.budget}
  - Dietary Restrictions: ${preferences.dietary.length > 0 ? preferences.dietary.join(', ') : 'none'}
  - Travel Style: ${tripStyle}
  - Pace: ${preferences.pace > 4 ? 'Fast-paced' : preferences.pace > 2 ? 'Moderate' : 'Leisurely'}
  - Walking Comfort: ${preferences.walkingComfort || 'moderate'}
  - Activities: ${preferences.activities?.length > 0 ? preferences.activities.join(', ') : 'all types'}
  ${preferences.customInterests ? `- Special Interests: ${preferences.customInterests}` : ''}

  Before generating each activity:
  1. Verify the place exists on Google Maps
  2. Confirm the start time is after previous activity's end time + 30 minutes
  3. Verify the activity duration is realistic
  4. Ensure meal times align with local customs
  
  RESPONSE FORMAT REQUIREMENTS:
  1. Return each activity as a separate JSON object
  2. Place each JSON object on a new line (NDJSON format)
  3. DO NOT wrap activities in an array
  4. DO NOT include an "itinerary" wrapper

  Response format (one per line):
  {
    "name": "string",
    "category": "string",
    "address": "string",
    "dayNumber": number,
    "startTime": "string",
    "endTime": "string",
    "notes": "string",
    "priceLevel": number
  }

  Example of correct format:
  {"name":"Place 1","category":"food_exploration","address":"123 Street","dayNumber":1,"startTime":"2024-03-15T09:00:00+09:00","endTime":"2024-03-15T10:00:00+09:00","notes":"Description","priceLevel":2}
  {"name":"Place 2","category":"city_sightseeing","address":"456 Avenue","dayNumber":1,"startTime":"2024-03-15T10:30:00+09:00","endTime":"2024-03-15T12:00:00+09:00","notes":"Description","priceLevel":3}`;
}
