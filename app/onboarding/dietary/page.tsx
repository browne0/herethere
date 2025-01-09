'use client';
import React, { useCallback, useState, useEffect } from 'react';

import { Utensils, Coffee } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { CUISINE_PREFERENCES, DIETARY_RESTRICTIONS } from '@/constants';
import { Cuisine, DietaryRestriction, usePreferences } from '@/lib/stores/preferences';
import { MealType } from '@/lib/types';
import { cn } from '@/lib/utils';

import ResponsiveMultiSelect from './ResponsiveMultiSelect';

// SSR-safe media query hook
const useSSRMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [query]);

  return mounted ? matches : false;
};

// Memoized meal button component
const MealButton = React.memo(
  ({
    meal,
    isImportant,
    onClick,
  }: {
    meal: MealType;
    isImportant: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        'p-3 rounded-lg border transition-all flex items-center gap-2 justify-center',
        isImportant ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      )}
    >
      {meal === 'breakfast' ? <Coffee className="w-4 h-4" /> : <Utensils className="w-4 h-4" />}
      <span className="capitalize">{meal}</span>
    </button>
  )
);

MealButton.displayName = 'MealButton';

const DietaryPage = () => {
  const {
    dietaryRestrictions,
    setDietaryRestrictions,
    cuisinePreferences,
    setCuisinePreferences,
    mealImportance,
    setMealImportance,
  } = usePreferences();

  const isDesktop = useSSRMediaQuery('(min-width: 768px)');
  const [mounted, setMounted] = useState(false);
  const meals: MealType[] = ['breakfast', 'lunch', 'dinner'];

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCuisineChange = useCallback(
    (preferred: Cuisine[]) => {
      setCuisinePreferences({ preferred, avoided: cuisinePreferences.avoided });
    },
    [setCuisinePreferences, cuisinePreferences.avoided]
  );

  const handleMealToggle = useCallback(
    (meal: MealType) => {
      setMealImportance({
        ...mealImportance,
        [meal]: !mealImportance[meal],
      });
    },
    [mealImportance, setMealImportance]
  );

  // SSR placeholder
  if (!mounted) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="h-8 w-48 bg-gray-200 rounded mb-6" /> {/* Title placeholder */}
        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <div className="h-6 w-32 bg-gray-200 rounded" /> {/* Section title placeholder */}
            <div className="h-10 w-full bg-gray-100 rounded" /> {/* Button placeholder */}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('max-w-2xl mx-auto', isDesktop ? '' : 'p-4')}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Food Preferences</h1>
        <p className="mt-2 text-gray-600">Let's personalize your dining experiences</p>
      </div>

      <Card className={cn('space-y-4', isDesktop ? 'p-6' : 'p-4')}>
        {/* Dietary Restrictions */}
        <div>
          <div className="font-medium">Dietary Restrictions</div>
          <div className="text-sm text-gray-500">Get catered restaurant suggestions for you</div>
          <ResponsiveMultiSelect<DietaryRestriction>
            options={DIETARY_RESTRICTIONS}
            selected={dietaryRestrictions}
            onChange={setDietaryRestrictions}
            placeholder="Select any dietary restrictions"
            title="Dietary Restrictions"
            searchPlaceholder="Search restrictions..."
            type="dietary"
            entity="dietary restrictions"
          />
        </div>

        {/* Cuisine Preferences */}
        <div>
          <div className="font-medium">Favorite Cuisines</div>
          <div className="text-sm text-gray-500">Select which foods you enjoy</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
            {CUISINE_PREFERENCES.map(cuisine => (
              <label key={cuisine.value} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cuisinePreferences.preferred.includes(cuisine.value)}
                  onChange={() => {
                    const newPreferred = cuisinePreferences.preferred.includes(cuisine.value)
                      ? cuisinePreferences.preferred.filter(c => c !== cuisine.value)
                      : [...cuisinePreferences.preferred, cuisine.value];
                    handleCuisineChange(newPreferred);
                  }}
                  className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{cuisine.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Meal Importance */}
        <div className="mb-2">
          <p className="font-medium">Important Meals</p>
          <p className="text-sm text-gray-500">Select which meals matter most</p>
        </div>
        <div className={cn('grid gap-3', isDesktop ? 'grid-cols-3' : 'grid-cols-1')}>
          {meals.map(meal => (
            <MealButton
              key={meal}
              meal={meal}
              isImportant={mealImportance[meal]}
              onClick={() => handleMealToggle(meal)}
            />
          ))}
        </div>
      </Card>
    </div>
  );
};

export default React.memo(DietaryPage);
