'use client';

import { Sun, Cloud, Moon } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TimeOfDay, usePreferences } from '@/lib/stores/preferences';

const TIME_PERIODS: Array<{ icon: React.ReactNode; label: string; value: TimeOfDay }> = [
  { icon: <Sun className="w-5 h-5" />, label: 'Morning', value: 'morning' },
  { icon: <Cloud className="w-5 h-5" />, label: 'Afternoon', value: 'afternoon' },
  { icon: <Moon className="w-5 h-5" />, label: 'Evening', value: 'evening' },
];

export default function TimePage() {
  const router = useRouter();
  const {
    bestTimeOfDay,
    setBestTimeOfDay,
    prefersIndoor,
    setPrefersIndoor,
    prefersOutdoor,
    setPrefersOutdoor,
  } = usePreferences();

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          When do you prefer different activities?
        </h1>
        <p className="mt-2 text-gray-600">This helps us schedule your perfect day</p>
      </div>

      <Card className="p-6">
        <div className="space-y-8">
          {/* Best Time of Day */}
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">Best Time of Day</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TIME_PERIODS.map(period => (
                <button
                  key={period.value}
                  onClick={() => {
                    setBestTimeOfDay(
                      bestTimeOfDay.includes(period.value)
                        ? bestTimeOfDay.filter(t => t !== period.value)
                        : [...bestTimeOfDay, period.value]
                    );
                  }}
                  className={`p-4 rounded-lg border transition-all ${
                    bestTimeOfDay.includes(period.value)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-gray-600">{period.icon}</span>
                    <span className="capitalize">{period.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Indoor Activities */}
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">When do you prefer indoor activities?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TIME_PERIODS.map(period => (
                <button
                  key={period.value}
                  onClick={() => {
                    setPrefersIndoor(
                      prefersIndoor.includes(period.value)
                        ? prefersIndoor.filter(t => t !== period.value)
                        : [...prefersIndoor, period.value]
                    );
                  }}
                  className={`p-4 rounded-lg border transition-all ${
                    prefersIndoor.includes(period.value)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-gray-600">{period.icon}</span>
                    <span className="capitalize">{period.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Outdoor Activities */}
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">When do you prefer outdoor activities?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TIME_PERIODS.map(period => (
                <button
                  key={period.value}
                  onClick={() => {
                    setPrefersOutdoor(
                      prefersOutdoor.includes(period.value)
                        ? prefersOutdoor.filter(t => t !== period.value)
                        : [...prefersOutdoor, period.value]
                    );
                  }}
                  className={`p-4 rounded-lg border transition-all ${
                    prefersOutdoor.includes(period.value)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-gray-600">{period.icon}</span>
                    <span className="capitalize">{period.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={() => router.push('/onboarding/summary')}>Continue</Button>
        </div>
      </Card>
    </>
  );
}
