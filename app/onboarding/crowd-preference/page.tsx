'use client';

import { Users, Sparkles, Shuffle } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { usePreferences } from '@/lib/stores/preferences';

const CROWD_PREFERENCES = [
  {
    value: 'popular',
    icon: <Users className="w-6 h-6" />,
    label: 'Popular Spots',
    description: "Major attractions and well-known places - you don't want to miss the must-sees",
  },
  {
    value: 'hidden',
    icon: <Sparkles className="w-6 h-6" />,
    label: 'Hidden Gems',
    description:
      'Off the beaten path places and local favorites - you prefer avoiding tourist crowds',
  },
  {
    value: 'mixed',
    icon: <Shuffle className="w-6 h-6" />,
    label: 'Mix of Both',
    description: 'Balance of famous sites and local discoveries - best of both worlds',
  },
] as const;

export default function CrowdPreferencesPage() {
  const { crowdPreference, setCrowdPreference } = usePreferences();

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          What's your sightseeing style?
        </h1>
        <p className="mt-2 text-gray-600">This helps us recommend the right mix of attractions</p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          {CROWD_PREFERENCES.map(preference => (
            <button
              key={preference.value}
              onClick={() => setCrowdPreference(preference.value)}
              className={`w-full p-4 rounded-lg border transition-all ${
                crowdPreference === preference.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="text-gray-600">{preference.icon}</div>
                <div className="text-left">
                  <div className="font-medium">{preference.label}</div>
                  <div className="text-sm text-gray-500">{preference.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </Card>
    </>
  );
}
