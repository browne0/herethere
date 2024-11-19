'use client';
import { useEffect } from 'react';

import { addMonths } from 'date-fns';
import { useRouter } from 'next/navigation';

import DateRangePicker from '@/components/DateRangePicker';
import { Button } from '@/components/ui/button';
import { useTripStore } from '@/lib/stores/tripStore';

export default function DatesPage() {
  const router = useRouter();
  const { city, dates, setDates } = useTripStore();

  // Only redirect if we don't have a city at all
  useEffect(() => {
    if (!city) {
      router.push('/trips/new');
    }
  }, [city, router]);

  const handleDateChange = (newDates: { startDate: Date | null; endDate: Date | null }) => {
    setDates({
      from: newDates.startDate,
      to: newDates.endDate,
    });
  };

  const handleNext = () => {
    if (dates?.from && dates?.to) {
      router.push('/trips/new/budget');
    }
  };

  const handleBack = () => {
    router.push('/trips/new');
  };

  if (!city) return null;
  return (
    <div className="relative p-4 sm:p-8 rounded-2xl bg-white shadow-xl border border-transparent">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
        When would you like to visit {city.name}?
      </h1>

      <DateRangePicker
        startDate={dates?.from ?? null}
        endDate={dates?.to ?? null}
        onChange={handleDateChange}
        minDate={new Date()}
        maxDate={addMonths(new Date(), 12)}
      />

      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={handleBack} size="sm">
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!dates?.from || !dates?.to}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700"
          size="sm"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
