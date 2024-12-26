// app/trips/new/activities/page.tsx
'use client';
import { useEffect } from 'react';

import {
  Waves,
  Landmark,
  Mountain,
  PartyPopper,
  Utensils,
  Wine,
  Heart,
  LucideIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useTripFormStore } from '@/lib/stores/tripFormStore';
import { ACTIVITY_CATEGORIES } from '@/lib/types/activities';

// Map icons to activity categories
const ACTIVITY_ICONS: Record<keyof typeof ACTIVITY_CATEGORIES, LucideIcon> = {
  BEACHES: Waves,
  CITY_SIGHTSEEING: Landmark,
  OUTDOOR_ADVENTURES: Mountain,
  FESTIVALS_EVENTS: PartyPopper,
  FOOD_EXPLORATION: Utensils,
  NIGHTLIFE: Wine,
  SPA_WELLNESS: Heart,
} as const;

// Create activity options from categories
const activityOptions = Object.entries(ACTIVITY_CATEGORIES).map(([key, category]) => ({
  id: category.id,
  label: category.label,
  icon: ACTIVITY_ICONS[key as keyof typeof ACTIVITY_CATEGORIES],
  description: category.description,
}));

export default function ActivitiesPage() {
  const router = useRouter();
  const { city, dates, budget, activities, setActivities } = useTripFormStore();

  // Redirect if previous steps not completed
  useEffect(() => {
    if (!city) {
      router.push('/trips/new');
    } else if (!dates?.from || !dates?.to) {
      router.push('/trips/new/dates');
    } else if (!budget) {
      router.push('/trips/new/budget');
    }
  }, [city, dates, budget, router]);

  const toggleActivity = (activityId: string) => {
    const newActivities = activities.includes(activityId)
      ? activities.filter(id => id !== activityId)
      : [...activities, activityId];
    setActivities(newActivities);
  };

  const handleNext = () => {
    if (activities.length > 0) {
      router.push('/trips/new/food');
    }
  };

  const handleBack = () => {
    router.push('/trips/new/budget');
  };

  if (!city || !dates || !budget) return null;

  return (
    <div className="relative p-4 sm:p-8 rounded-2xl bg-white shadow-xl border border-transparent">
      <h1 className="text-2xl sm:text-3xl md:text-3xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
        What would you like to do in {city.name}?
      </h1>

      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activityOptions.map(({ id, label, icon: Icon, description }) => (
            <button
              key={id}
              onClick={() => toggleActivity(id)}
              className={`group p-4 rounded-xl border transition-all duration-300 text-left
                ${
                  activities.includes(id)
                    ? 'border-indigo-600 bg-indigo-50/50'
                    : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <Icon
                    className={`w-5 h-5 ${
                      activities.includes(id) ? 'text-indigo-600' : 'text-gray-500'
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

        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={handleBack} size="sm">
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={activities.length === 0}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700"
            size="sm"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
