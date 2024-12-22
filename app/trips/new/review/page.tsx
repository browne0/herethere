// app/trips/new/review/page.tsx
'use client';
import { useEffect, useRef, useState } from 'react';

import { Prisma } from '@prisma/client';
import { CalendarDays, MapPin, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Cuisine, DietaryRestriction } from '@/lib/stores/preferences';
import { useTripFormStore } from '@/lib/stores/tripFormStore';
import { BudgetLevel } from '@/lib/types';
import { ACTIVITY_CATEGORIES } from '@/lib/types/activities';

interface CreateTripRequest {
  title: string;
  startDate: Date;
  endDate: Date;
  preferences: {
    budget: BudgetLevel;
    activities: string[];
    cuisinePreferences: { preferred: Cuisine[]; avoided: Cuisine[] };
    dietaryRestrictions: DietaryRestriction[];
  };
  city: Prisma.CityCreateInput;
}

const ACTIVITY_ID_TO_LABEL = Object.values(ACTIVITY_CATEGORIES).reduce(
  (acc, category) => ({
    ...acc,
    [category.id]: category.label,
  }),
  {} as Record<string, string>
);

export default function ReviewPage() {
  const router = useRouter();
  const {
    city,
    dates,
    budget,
    activities,
    tripCuisinePreferences,
    tripDietaryRestrictions,
    reset,
  } = useTripFormStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shouldCheckValidation = useRef(true);

  // Only redirect if previous steps are missing
  useEffect(() => {
    if (!shouldCheckValidation.current) return;

    if (!city) {
      router.push('/trips/new');
    } else if (!dates?.from || !dates?.to) {
      router.push('/trips/new/dates');
    } else if (!budget) {
      router.push('/trips/new/budget');
    } else if (!activities.length) {
      router.push('/trips/new/activities');
    }
  }, [city, dates, budget, activities, router]);

  const handleSubmit = async () => {
    if (!city || !dates?.from || !dates?.to || !budget || !activities.length) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const tripData: CreateTripRequest = {
        title: `Trip to ${city.name}`,
        startDate: dates.from,
        endDate: dates.to,
        preferences: {
          budget,
          activities,
          cuisinePreferences: tripCuisinePreferences,
          dietaryRestrictions: tripDietaryRestrictions,
        },
        city,
      };

      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tripData),
      });

      if (!response.ok) {
        throw new Error('Failed to create trip');
      }

      const trip = await response.json();

      // Disable validation checks before resetting and navigating
      shouldCheckValidation.current = false;

      reset();
      router.push(`/trips/${trip.id}`);
    } catch (error) {
      console.error('Error creating trip:', error);
      setError('Failed to create trip. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (section: 'city' | 'dates' | 'budget' | 'activities' | 'food') => {
    shouldCheckValidation.current = false;
    const routes = {
      city: '/trips/new',
      dates: '/trips/new/dates',
      budget: '/trips/new/budget',
      activities: '/trips/new/activities',
      food: '/trips/new/food',
    };
    router.push(routes[section]);
  };

  const handleBack = () => {
    shouldCheckValidation.current = false;
    router.push('/trips/new/food');
  };

  if (!city || !dates || !budget || !activities.length) return null;

  return (
    <div className="relative p-4 sm:p-8 rounded-2xl bg-white shadow-xl border border-transparent">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
        Review Your Trip Details
      </h1>

      <div className="space-y-6">
        <div className="rounded-lg bg-indigo-50 p-6">
          <h2 className="text-xl font-semibold text-indigo-900 mb-4">Trip Summary</h2>

          <div className="space-y-4">
            <div className="flex items-start gap-3 group">
              <MapPin className="w-5 h-5 text-indigo-600 mt-1" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Destination</h3>
                  <button
                    onClick={() => handleEdit('city')}
                    className="text-sm text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-gray-600">{city.name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 group">
              <CalendarDays className="w-5 h-5 text-indigo-600 mt-1" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Dates</h3>
                  <button
                    onClick={() => handleEdit('dates')}
                    className="text-sm text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-gray-600">
                  {new Date(dates.from!).toLocaleDateString()} -{' '}
                  {new Date(dates.to!).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 group">
              <Wallet className="w-5 h-5 text-indigo-600 mt-1" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Budget Level</h3>
                  <button
                    onClick={() => handleEdit('budget')}
                    className="text-sm text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-gray-600 capitalize">{budget}</p>
              </div>
            </div>

            <div className="group">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">Selected Activities</h3>
                <button
                  onClick={() => handleEdit('activities')}
                  className="text-sm text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Edit
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {activities.map(activity => (
                  <span
                    key={activity}
                    className="px-3 py-1 rounded-full bg-white text-indigo-600 text-sm font-medium border border-indigo-100"
                  >
                    {ACTIVITY_ID_TO_LABEL[activity] || activity}
                  </span>
                ))}
              </div>
            </div>

            <div className="group">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">Foods you enjoy</h3>
                <button
                  onClick={() => handleEdit('food')}
                  className="text-sm text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Edit
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tripCuisinePreferences.preferred.map(cuisine => (
                  <span
                    key={cuisine}
                    className="px-3 py-1 rounded-full bg-white text-indigo-600 text-sm font-medium border border-indigo-100 capitalize"
                  >
                    {cuisine}
                  </span>
                ))}
              </div>
              <h3 className="font-medium text-gray-900 mt-4 mb-2">Your dietary restrictions</h3>
              <div className="flex flex-wrap gap-2">
                {tripDietaryRestrictions.map(restriction => (
                  <span
                    key={restriction}
                    className="px-3 py-1 rounded-full bg-white text-indigo-600 text-sm font-medium border border-indigo-100 capitalize"
                  >
                    {restriction}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}

        <div className="text-center text-sm text-gray-600">
          <p>Ready to create your personalized trip itinerary?</p>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={handleBack} size="sm">
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          size="lg"
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700"
        >
          {isSubmitting ? 'Generating Trip...' : 'Generate My Trip'}
        </Button>
      </div>
    </div>
  );
}
