'use client';

import { Bike, Sun, Moon } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { StartTime, usePreferences } from '@/lib/stores/preferences';

const ENERGY_LEVELS = [
  {
    value: 1,
    label: 'Light & Easy',
    description: 'Mostly walking and sightseeing',
    icon: <Bike className="w-6 h-6" />,
  },
  {
    value: 2,
    label: 'Moderate',
    description: 'Mix of walking and activities',
    icon: <Bike className="w-6 h-6" />,
  },
  {
    value: 3,
    label: 'Very Active',
    description: 'Full days of activities and exploration',
    icon: <Bike className="w-6 h-6" />,
  },
];

const START_TIMES = [
  {
    value: 'early',
    label: 'Early Bird',
    description: 'Start days before 8am',
    icon: <Sun className="w-6 h-6" />,
  },
  {
    value: 'mid',
    label: 'Mid-Morning',
    description: 'Start days around 9-10am',
    icon: <Sun className="w-6 h-6" />,
  },
  {
    value: 'late',
    label: 'Later Start',
    description: 'Start days after 10am',
    icon: <Moon className="w-6 h-6" />,
  },
];

export default function PacePage() {
  const { energyLevel, setEnergyLevel, preferredStartTime, setPreferredStartTime } =
    usePreferences();

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">What's your travel style?</h1>
        <p className="mt-2 text-gray-600">Help us plan the right pace for your trips</p>
      </div>

      <Card className="p-6">
        <div className="space-y-8">
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">Energy Level</h2>
            {ENERGY_LEVELS.map(level => (
              <button
                key={level.value}
                onClick={() => setEnergyLevel(level.value as 1 | 2 | 3)}
                className={`w-full p-4 rounded-lg border transition-all ${
                  energyLevel === level.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-gray-600">{level.icon}</div>
                  <div className="text-left">
                    <div className="font-medium">{level.label}</div>
                    <div className="text-sm text-gray-500">{level.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <h2 className="font-semibold text-lg">When do you like to start your day?</h2>
            {START_TIMES.map(time => (
              <button
                key={time.value}
                onClick={() => setPreferredStartTime(time.value as StartTime)}
                className={`w-full p-4 rounded-lg border transition-all ${
                  preferredStartTime === time.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-gray-600">{time.icon}</div>
                  <div className="text-left">
                    <div className="font-medium">{time.label}</div>
                    <div className="text-sm text-gray-500">{time.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Card>
    </>
  );
}
