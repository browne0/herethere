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

  CRITICAL REQUIREMENT: ALL activities MUST be located IN ${cityData.name} proper - not in other countries or nearby cities.

  Plan approximately ${activitiesPerDay} activities per day. For each activity, include:
  1. Name (use official, findable place names)
  2. Category (one of: ${Object.values(ACTIVITY_CATEGORIES)
    .map(cat => cat.id)
    .join(', ')})
  3. Complete address as it appears on Google Maps
  4. Day number (1 = first day, 2 = second day, etc.)
  5. Start and end times (ISO 8601 with timezone offset)
  6. Brief description/notes
  7. Price level (1-4)

    ALL times MUST be provided in ISO 8601 format with the correct timezone offset.
    Example for Asia/Tokyo: 2024-03-15T14:30:00+09:00 (for Tokyo)

    Schedule Guidelines:
    1. Every activity MUST include timezone offset in times
    2. Start each day no earlier than 09:00 ${tripTimeZone}
    3. End each day no later than 22:00 ${tripTimeZone}
    4. Allow 30-45 minutes between activities for travel
    5. Schedule meals at culturally appropriate times for ${cityData.name}
    6. Use verified, existing places findable on Google Maps
    
    Trip Details:
    - Budget Level: ${preferences.budget}
    - Dietary Restrictions: ${preferences.dietary.length > 0 ? preferences.dietary.join(', ') : 'none'}
    - Travel Style: ${tripStyle}
    - Pace: ${preferences.pace > 4 ? 'Fast-paced' : preferences.pace > 2 ? 'Moderate' : 'Leisurely'}
    - Walking Comfort: ${preferences.walkingComfort || 'moderate'}
    - Activities: ${preferences.activities?.length > 0 ? preferences.activities.join(', ') : 'all types'}
    ${preferences.customInterests ? `- Special Interests: ${preferences.customInterests}` : ''}
    
    Response format:
    Output each activity as a separate, complete JSON object on a single line. Do not include any other text between activities.

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
      
    Repeat this format for each activity, one activity per line, and no extra lines or text between activities.`;
}
