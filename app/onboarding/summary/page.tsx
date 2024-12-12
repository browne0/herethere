'use client';

import { Check, Mountain, Utensils, Settings, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePreferences } from '@/lib/stores/preferences';

export default function SummaryPage() {
  const router = useRouter();
  const preferences = usePreferences();

  const getCrowdPreferenceLabel = (pref: string) => {
    switch (pref) {
      case 'popular':
        return 'Popular attractions';
      case 'hidden':
        return 'Hidden gems and local spots';
      case 'mixed':
        return 'Mix of popular spots and hidden gems';
      default:
        return 'No preference set';
    }
  };

  const ENERGY_LEVELS = [
    {
      value: 1,
      label: 'Light & Easy',
      description: 'Mostly walking and sightseeing',
    },
    {
      value: 2,
      label: 'Moderate',
      description: 'Mix of walking and activities',
    },
    {
      value: 3,
      label: 'Very Active',
      description: 'Full days of activities and exploration',
    },
  ];

  const START_TIMES = {
    early: 'Likes a early start',
    mid: 'Enjoys a mid-morning start',
    late: "Doesn't mind a late start",
  };

  const getEnergyLevelDescription = (level: number | null) => {
    if (!level) return 'No energy level set';
    const energyLevel = ENERGY_LEVELS.find(el => el.value === level);
    return energyLevel ? energyLevel.description : 'No energy level set';
  };

  const getStartTimeDescription = (time: string | null) => {
    if (!time || !(time in START_TIMES)) return 'No start time preference set';
    return START_TIMES[time as keyof typeof START_TIMES];
  };

  const sections = [
    {
      title: 'Interests',
      icon: <Mountain className="w-5 h-5" />,
      items: preferences.interests,
      edit: () => router.push('/onboarding/interests'),
    },
    {
      title: 'Travel Style',
      icon: <Settings className="w-5 h-5" />,
      items: [
        getEnergyLevelDescription(preferences.energyLevel),
        getStartTimeDescription(preferences.preferredStartTime),
      ],
      edit: () => router.push('/onboarding/pace'),
    },
    {
      title: 'Food Preferences',
      icon: <Utensils className="w-5 h-5" />,
      items: [
        ...preferences.dietaryRestrictions,
        ...preferences.cuisinePreferences.preferred.map(c => `Likes ${c}`),
      ],
      edit: () => router.push('/onboarding/dietary'),
    },
    {
      title: 'Sightseeing Preferences',
      icon: <Users className="w-5 h-5" />,
      items: [getCrowdPreferenceLabel(preferences.crowdPreference!)],
      edit: () => router.push('/onboarding/crowd-preference'),
    },
  ];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Your Travel Profile</h1>
        <p className="mt-2 text-gray-600">Review and confirm your preferences</p>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          {sections.map(section => (
            <div key={section.title} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">{section.icon}</span>
                  <h2 className="font-semibold text-lg">{section.title}</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={section.edit}>
                  Edit
                </Button>
              </div>
              <div className="pl-7 space-y-1">
                {section.items.length > 0 ? (
                  section.items.map((item, i) => (
                    <div key={i} className="flex items-center space-x-2 text-gray-600">
                      <Check className="w-4 h-4" />
                      <span className={section.title === 'Travel Style' ? '' : 'capitalize'}>
                        {item}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Check className="w-4 h-4" />
                    <span className="capitalize">No preferences given</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
