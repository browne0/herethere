import type { ParsedActivityRecommendation } from '../types';

interface TripPreferences {
  budget: 'budget' | 'moderate' | 'luxury';
  activities: string[];
}

export function getActivityContext(
  activity: ParsedActivityRecommendation,
  preferences: TripPreferences
) {
  let recommendation = '';

  // Match with selected activities
  const matchingActivity = preferences.activities.find(prefActivity =>
    activity.tags.tags.includes(prefActivity.toLowerCase())
  );

  if (matchingActivity) {
    recommendation = `Matches your interest in ${matchingActivity.toLowerCase()}`;
  }

  // Budget match
  if (!recommendation) {
    if (preferences.budget === 'luxury' && activity.price > 10000) {
      // $100+
      recommendation = 'Premium experience fitting your budget';
    } else if (preferences.budget === 'budget' && activity.price < 5000) {
      // Under $50
      recommendation = 'Great value activity';
    }
  }

  // Time of day suggestions
  if (!recommendation) {
    const hour = new Date().getHours();
    if (hour < 12 && activity.availableDays.days.includes(new Date().getDay())) {
      recommendation = 'Perfect morning activity';
    } else if (hour >= 12 && hour < 17) {
      recommendation = 'Great for the afternoon';
    } else {
      recommendation = 'Popular evening choice';
    }
  }

  // Mock recent bookings (we'll replace this with real data later)
  const recentBookings = Math.floor(Math.random() * 45) + 5; // 5-50 range

  return {
    recommendation,
    recentBookings,
  };
}
