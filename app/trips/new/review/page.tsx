// app/trips/new/review/page.tsx
'use client';
import { useEffect, useState } from 'react';

import { CalendarDays, MapPin, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useTripStore } from '@/lib/stores/tripStore';

export default function ReviewPage() {
  const router = useRouter();
  const { city, dates, budget, activities, reset } = useTripStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only redirect if previous steps are missing
  useEffect(() => {
    if (!city) {
      router.push('/trips/new');
    } else if (!dates?.from || !dates?.to) {
      router.push('/trips/new/dates');
    } else if (!budget) {
      router.push('/trips/new/budget');
    } else if (!activities.length) {
      router.push('/trips/new/activities');
    }
  }, [city, dates, budget, activities, router]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Trip to ${city?.name}`,
          preferences: {
            city,
            dates,
            budget,
            activities,
          },
          latitude: city?.latitude,
          longitude: city?.longitude,
          placeId: city?.placeId,
          destination: city?.name,
          startDate: dates?.from,
          endDate: dates?.to,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate trip');
      }

      const {
        trip: { id },
      } = await response.json();
      reset(); // Clear the store after successful creation
      router.push(`/trips/${id}`);
    } catch (error) {
      console.error('Error generating trip:', error);
      setError('Failed to generate trip. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (section: 'city' | 'dates' | 'budget' | 'activities') => {
    const routes = {
      city: '/trips/new',
      dates: '/trips/new/dates',
      budget: '/trips/new/budget',
      activities: '/trips/new/activities',
    };
    router.push(routes[section]);
  };

  const handleBack = () => {
    router.push('/trips/new/activities');
  };

  if (!city || !dates || !budget || !activities.length) return null;

  return (
    <div className="relative p-4 sm:p-8 rounded-2xl bg-white shadow-xl border border-transparent">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
        Review Your Trip Details
      </h1>

      <div className="space-y-6">
        <div className="rounded-lg bg-indigo-50 p-6">
          <h2 className="text-xl font-semibold text-indigo-900 mb-4">Trip Summary</h2>

          <div className="space-y-4">
            <div className="flex items-start gap-3 group">
              <MapPin className="w-5 h-5 text-indigo-600 mt-1" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Destination</h3>
                  <button
                    onClick={() => handleEdit('city')}
                    className="text-sm text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-gray-600">{city.name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 group">
              <CalendarDays className="w-5 h-5 text-indigo-600 mt-1" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Dates</h3>
                  <button
                    onClick={() => handleEdit('dates')}
                    className="text-sm text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-gray-600">
                  {dates.from?.toLocaleDateString()} - {dates.to?.toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 group">
              <Wallet className="w-5 h-5 text-indigo-600 mt-1" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Budget Level</h3>
                  <button
                    onClick={() => handleEdit('budget')}
                    className="text-sm text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-gray-600 capitalize">{budget}</p>
              </div>
            </div>

            <div className="group">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">Selected Activities</h3>
                <button
                  onClick={() => handleEdit('activities')}
                  className="text-sm text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Edit
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {activities.map(activity => (
                  <span
                    key={activity}
                    className="px-3 py-1 rounded-full bg-white text-indigo-600 text-sm font-medium border border-indigo-100"
                  >
                    {activity}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}

        <div className="text-center text-sm text-gray-600">
          <p>Ready to create your personalized trip itinerary?</p>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={handleBack} size="sm">
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          size="lg"
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700"
        >
          {isSubmitting ? 'Generating Trip...' : 'Generate My Trip'}
        </Button>
      </div>
    </div>
  );
}
