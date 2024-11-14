import React from 'react';

import {
  Waves,
  Landmark,
  Mountain,
  PartyPopper,
  Utensils,
  Wine,
  ShoppingBag,
  Heart,
  LucideIcon,
} from 'lucide-react';

import { Textarea } from '@/components/ui/textarea';
import { DemoTripPreferences, TripPreferences } from '@/lib/types';
import { ACTIVITY_CATEGORIES } from '@/lib/types/activities';

// Map icons to our activity categories
const ACTIVITY_ICONS: Record<keyof typeof ACTIVITY_CATEGORIES, LucideIcon> = {
  BEACHES: Waves,
  CITY_SIGHTSEEING: Landmark,
  OUTDOOR_ADVENTURES: Mountain,
  FESTIVALS_EVENTS: PartyPopper,
  FOOD_EXPLORATION: Utensils,
  NIGHTLIFE: Wine,
  SHOPPING: ShoppingBag,
  SPA_WELLNESS: Heart,
} as const;

// Create our activity options from the categories
const activityOptions = Object.entries(ACTIVITY_CATEGORIES).map(([key, category]) => ({
  id: category.id,
  label: category.label,
  icon: ACTIVITY_ICONS[key as keyof typeof ACTIVITY_CATEGORIES],
  description: category.description,
}));

interface ActivityPreferencesStepProps<T extends DemoTripPreferences | TripPreferences> {
  preferences: T;
  updatePreferences: <K extends keyof T>(key: K, value: T[K]) => void;
}

export function ActivityPreferencesStep<T extends DemoTripPreferences | TripPreferences>({
  preferences,
  updatePreferences,
}: ActivityPreferencesStepProps<T>) {
  const toggleActivity = (activityId: string) => {
    const currentActivities = preferences.activities || [];
    const newActivities = currentActivities.includes(activityId)
      ? currentActivities.filter(id => id !== activityId)
      : [...currentActivities, activityId];

    updatePreferences('activities', newActivities);
  };

  return (
    <div className="space-y-8">
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 text-center">
        Which activities are you interested in?
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {activityOptions.map(({ id, label, icon: Icon, description }) => (
          <button
            key={id}
            onClick={() => toggleActivity(id)}
            className={`group p-4 rounded-xl border transition-all duration-300 text-left
              ${
                preferences.activities?.includes(id)
                  ? 'border-indigo-600 bg-indigo-50/50'
                  : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30'
              }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <Icon
                  className={`w-5 h-5 ${
                    preferences.activities?.includes(id) ? 'text-indigo-600' : 'text-gray-500'
                  } group-hover:scale-110 transition-transform duration-300`}
                />
              </div>
              <div>
                <span className="font-medium text-gray-900 block">{label}</span>
                <span className="text-xs text-gray-500">{description}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          Anything specific you&apos;re looking forward to?
        </label>
        <Textarea
          placeholder="E.g., 'Visit the famous night market' or 'Find the best local coffee shops'"
          value={preferences.customInterests || ''}
          onChange={e => updatePreferences('customInterests', e.target.value)}
          className="h-24"
        />
        <p className="text-xs text-gray-500">
          Tell us about any particular experiences or places you&apos;d like to include in your
          trip.
        </p>
      </div>
    </div>
  );
}
