import { PreferencesState } from '@/lib/stores/preferences';

interface FetchRecommendationsProps {
  cityId: string;
  userPreferences: Partial<PreferencesState>;
  budget: string;
  startTime?: string;
}

export async function fetchRestaurantRecommendations({
  cityId,
  userPreferences,
  budget,
  startTime,
}: FetchRecommendationsProps) {
  const params = new URLSearchParams({
    cityId,
    pricePreference: userPreferences.pricePreference?.toString() || '',
    dietaryRestrictions: JSON.stringify(userPreferences.dietaryRestrictions || []),
    cuisinePreferences: JSON.stringify(
      userPreferences.cuisinePreferences || { preferred: [], avoided: [] }
    ),
    mealImportance: JSON.stringify(userPreferences.mealImportance || {}),
    transportPreferences: JSON.stringify(userPreferences.transportPreferences || []),
    crowdPreference: userPreferences.crowdPreference || 'mixed',
    budget,
    ...(startTime && { startTime }),
  });

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/recommendations/restaurants?${params}`
  );

  if (!response.ok) {
    console.error('Failed to fetch restaurant recommendations');
    return { restaurants: [] };
  }

  const data = await response.json();

  return {
    title: 'Food & Dining',
    type: 'restaurants',
    activities: data.restaurants,
  };
}
