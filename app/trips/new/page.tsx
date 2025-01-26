'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTripFormStore } from '@/lib/stores/tripFormStore';

export default function TripNamePage() {
  const router = useRouter();
  const { tripName, setTripName } = useTripFormStore();

  const handleNext = () => {
    if (tripName?.trim()) {
      router.push('/trips/new/city');
    }
  };

  return (
    <div className="relative p-4 sm:p-8 rounded-2xl bg-white shadow-xl border border-transparent">
      <h1 className="text-2xl sm:text-3xl md:text-3xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
        Name your trip
      </h1>

      <div className="space-y-6">
        <Input
          placeholder="Enter your trip name"
          value={tripName}
          onChange={e => setTripName(e.target.value)}
          className="w-full"
          maxLength={50}
        />

        <div className="flex justify-end mt-8">
          <Button
            onClick={handleNext}
            disabled={!tripName?.trim()}
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
