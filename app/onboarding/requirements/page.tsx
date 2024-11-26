'use client';

import { User2, Bus, Car } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TransportMode, usePreferences } from '@/lib/stores/preferences';

const TRANSPORT_PREFERENCES: Array<{ icon: React.ReactNode; label: string; value: TransportMode }> =
  [
    { icon: <User2 className="w-5 h-5" />, label: 'Walking', value: 'walking' },
    { icon: <Bus className="w-5 h-5" />, label: 'Public Transit', value: 'public-transit' },
    { icon: <Car className="w-5 h-5" />, label: 'Taxi/Rideshare', value: 'taxi' },
  ];

export default function RequirementsPage() {
  const router = useRouter();
  const { transportPreferences, setTransportPreferences } = usePreferences();

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Your Travel Requirements</h1>
        <p className="mt-2 text-gray-600">Help us understand your needs for comfortable travel</p>
      </div>

      <Card className="p-6">
        <div className="space-y-8">
          {/* Transport */}
          <div className="space-y-4">
            <h2 className="font-semibold text-lg">Preferred Transportation</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TRANSPORT_PREFERENCES.map(transport => (
                <button
                  key={transport.value}
                  onClick={() => {
                    setTransportPreferences(
                      transportPreferences.includes(transport.value)
                        ? transportPreferences.filter(t => t !== transport.value)
                        : [...transportPreferences, transport.value]
                    );
                  }}
                  className={`p-4 rounded-lg border transition-all flex items-center space-x-3 ${
                    transportPreferences.includes(transport.value)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-gray-600">{transport.icon}</span>
                  <span>{transport.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={() => router.push('/onboarding/time')}>Continue</Button>
        </div>
      </Card>
    </>
  );
}
