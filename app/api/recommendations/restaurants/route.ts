import { NextResponse } from 'next/server';

import {
  restaurantRecommendationService,
  RestaurantScoringParams,
  TripBudget,
} from '@/app/api/services/recommendations/restaurants';
import { PricePreference } from '@/lib/stores/preferences';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityId = searchParams.get('cityId');

    if (!cityId) {
      return NextResponse.json({ error: 'City ID is required' }, { status: 400 });
    }

    const scoringParams: RestaurantScoringParams = {
      pricePreference: Number(searchParams.get('pricePreference')) as PricePreference,
      dietaryRestrictions: JSON.parse(searchParams.get('dietaryRestrictions') || '[]'),
      cuisinePreferences: JSON.parse(
        searchParams.get('cuisinePreferences') || '{"preferred":[],"avoided":[]}'
      ),
      mealImportance: JSON.parse(searchParams.get('mealImportance') || '{}'),
      transportPreferences: JSON.parse(searchParams.get('transportPreferences') || '[]'),
      crowdPreference:
        (searchParams.get('crowdPreference') as 'popular' | 'hidden' | 'mixed') || 'mixed',
      budget: (searchParams.get('budget') || 'moderate') as TripBudget,
      startTime: searchParams.get('startTime') || undefined,
      currentLocation: searchParams.get('currentLocation')
        ? JSON.parse(searchParams.get('currentLocation')!)
        : undefined,
    };

    const restaurants = await restaurantRecommendationService.getRecommendations(
      cityId,
      scoringParams
    );

    return NextResponse.json(restaurants);
  } catch (error) {
    console.error('[RESTAURANT_RECOMMENDATIONS_GET]', error);
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 });
  }
}
