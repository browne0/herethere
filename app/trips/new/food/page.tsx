'use client';
import React, { useState, useEffect, useCallback } from 'react';

import { useRouter } from 'next/navigation';

import ResponsiveMultiSelect from '@/app/onboarding/dietary/ResponsiveMultiSelect';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CUISINE_PREFERENCES, DIETARY_RESTRICTIONS } from '@/constants';
import { Cuisine, DietaryRestriction, usePreferences } from '@/lib/stores/preferences';
import { useTripFormStore } from '@/lib/stores/tripFormStore';
import { cn } from '@/lib/utils';

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

const FoodPage = () => {
  const { dietaryRestrictions, cuisinePreferences } = usePreferences();
  const {
    setTripCuisinePreferences,
    setTripDietaryRestrictions,
    tripCuisinePreferences,
    tripDietaryRestrictions,
  } = useTripFormStore();

  const router = useRouter();

  const isDesktop = useSSRMediaQuery('(min-width: 768px)');
  const [mounted, setMounted] = useState(false);

  const handleNext = () => {
    router.push('/trips/new/review');
  };

  const handleBack = () => {
    router.push('/trips/new/activities');
  };

  const handleCuisineChange = useCallback(
    (preferred: Cuisine[]) => {
      setTripCuisinePreferences({ preferred, avoided: tripCuisinePreferences.avoided });
    },
    [setTripCuisinePreferences, tripCuisinePreferences.avoided]
  );

  useEffect(() => {
    setMounted(true);

    // Only initialize if no preferences have been set yet
    if (tripCuisinePreferences.preferred.length === 0 && tripDietaryRestrictions.length === 0) {
      setTripCuisinePreferences(cuisinePreferences);
      setTripDietaryRestrictions(dietaryRestrictions);
    }
  }, [
    cuisinePreferences,
    dietaryRestrictions,
    setTripCuisinePreferences,
    setTripDietaryRestrictions,
    tripCuisinePreferences.preferred.length,
    tripDietaryRestrictions.length,
  ]);

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
      <Card className={cn('space-y-4', isDesktop ? 'p-6' : 'p-4')}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Food Preferences</h1>
          <p className="mt-2 text-gray-600">
            Let's personalize your dining experiences for this trip.
          </p>
        </div>
        {/* Dietary Restrictions */}
        <div>
          <div className="font-medium">Dietary Restrictions</div>
          <div className="text-sm text-gray-500 mb-2">
            Get catered restaurant suggestions for you
          </div>
          <ResponsiveMultiSelect<DietaryRestriction>
            options={DIETARY_RESTRICTIONS}
            selected={tripDietaryRestrictions}
            onChange={setTripDietaryRestrictions}
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
          <div className="text-sm text-gray-500 mb-2">Select which foods you enjoy</div>
          <ResponsiveMultiSelect<Cuisine>
            options={CUISINE_PREFERENCES}
            selected={tripCuisinePreferences.preferred}
            onChange={handleCuisineChange}
            placeholder="Select your favorite cuisines"
            title="Favorite Cuisines"
            searchPlaceholder="Search cuisines..."
            entity="cuisines"
          />
        </div>
      </Card>
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={handleBack} size="sm">
          Back
        </Button>
        <Button
          onClick={handleNext}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700"
          size="sm"
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default React.memo(FoodPage);
