'use client';

import { Mountain, Palette, Music, Camera, Book, Utensils } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InterestType, usePreferences } from '@/lib/stores/preferences';

const INTERESTS: Array<{ icon: React.ReactNode; label: string; value: InterestType }> = [
  { icon: <Mountain className="w-6 h-6" />, label: 'Nature & Outdoors', value: 'outdoors' },
  { icon: <Palette className="w-6 h-6" />, label: 'Arts & Culture', value: 'arts' },
  { icon: <Utensils className="w-6 h-6" />, label: 'Food & Dining', value: 'food' },
  { icon: <Music className="w-6 h-6" />, label: 'Entertainment', value: 'entertainment' },
  { icon: <Camera className="w-6 h-6" />, label: 'Photography', value: 'photography' },
  { icon: <Book className="w-6 h-6" />, label: 'History', value: 'history' },
];

export default function InterestsPage() {
  const router = useRouter();
  const { interests, setInterests } = usePreferences();

  const handleNext = () => {
    // Optional: Add analytics
    // track('completed_interests', { interests });
    router.push('/onboarding/pace');
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          What interests you while traveling?
        </h1>
        <p className="mt-2 text-gray-600">Select all that match your interests</p>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {INTERESTS.map(interest => (
            <button
              key={interest.value}
              onClick={() => {
                setInterests(
                  interests.includes(interest.value)
                    ? interests.filter(i => i !== interest.value)
                    : [...interests, interest.value]
                );
              }}
              className={`p-4 rounded-lg border transition-all relative ${
                interests.includes(interest.value)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="text-gray-600">{interest.icon}</div>
                <span className="font-medium">{interest.label}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleNext} disabled={interests.length === 0}>
            Continue
          </Button>
        </div>
      </Card>
    </>
  );
}
