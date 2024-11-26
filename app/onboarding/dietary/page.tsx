'use client';

import { Utensils, Coffee } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Cuisine, DietaryRestriction, usePreferences } from '@/lib/stores/preferences';

// Type your constant arrays
const DIETARY_RESTRICTIONS: Array<{ label: string; value: DietaryRestriction }> = [
  { label: 'Vegetarian', value: 'vegetarian' },
  { label: 'Vegan', value: 'vegan' },
  { label: 'Gluten-Free', value: 'gluten-free' },
  { label: 'Halal', value: 'halal' },
  { label: 'Kosher', value: 'kosher' },
];

const CUISINE_PREFERENCES: Array<{ label: string; value: Cuisine }> = [
  { label: 'Italian', value: 'italian' },
  { label: 'Japanese', value: 'japanese' },
  { label: 'Chinese', value: 'chinese' },
  { label: 'Mexican', value: 'mexican' },
  { label: 'Thai', value: 'thai' },
  { label: 'Indian', value: 'indian' },
];

const MEAL_KEYS = ['breakfast', 'lunch', 'dinner'] as const;

export default function DietaryPage() {
  const router = useRouter();
  const {
    dietaryRestrictions,
    setDietaryRestrictions,
    cuisinePreferences,
    setCuisinePreferences,
    mealImportance,
    setMealImportance,
  } = usePreferences();

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Tell us about your food preferences
        </h1>
        <p className="mt-2 text-gray-600">This helps us recommend the best dining experiences</p>
      </div>

      <Card className="p-6">
        <div className="space-y-8">
          {/* Dietary Restrictions */}
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">Any dietary restrictions?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DIETARY_RESTRICTIONS.map(restriction => (
                <button
                  key={restriction.value}
                  onClick={() => {
                    setDietaryRestrictions(
                      dietaryRestrictions.includes(restriction.value)
                        ? dietaryRestrictions.filter(r => r !== restriction.value)
                        : [...dietaryRestrictions, restriction.value]
                    );
                  }}
                  className={`p-3 rounded-lg border transition-all ${
                    dietaryRestrictions.includes(restriction.value)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {restriction.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cuisine Preferences */}
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">Favorite cuisines?</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CUISINE_PREFERENCES.map(cuisine => (
                <button
                  key={cuisine.value}
                  onClick={() => {
                    setCuisinePreferences({
                      ...cuisinePreferences,
                      preferred: cuisinePreferences.preferred.includes(cuisine.value)
                        ? cuisinePreferences.preferred.filter(c => c !== cuisine.value)
                        : [...cuisinePreferences.preferred, cuisine.value],
                    });
                  }}
                  className={`p-3 rounded-lg border transition-all ${
                    cuisinePreferences.preferred.includes(cuisine.value)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {cuisine.label}
                </button>
              ))}
            </div>
          </div>

          {/* Meal Importance */}
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">Which meals are important to you?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {MEAL_KEYS.map(meal => (
                <button
                  key={meal}
                  onClick={() => {
                    setMealImportance({
                      ...mealImportance,
                      [meal]: !mealImportance[meal],
                    });
                  }}
                  className={`p-3 rounded-lg border transition-all flex items-center space-x-2 ${
                    mealImportance[meal]
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {meal === 'breakfast' && <Coffee className="w-5 h-5" />}
                  {meal !== 'breakfast' && <Utensils className="w-5 h-5" />}
                  <span className="capitalize">{meal}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={() => router.push('/onboarding/requirements')}>Continue</Button>
        </div>
      </Card>
    </>
  );
}
