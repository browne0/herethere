'use client';

import { useEffect } from 'react';

import { format } from 'date-fns';
import { Calendar, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

import { ItineraryView } from './components/ItineraryView';
import { RecommendationsView } from './components/RecommendationsView';
import { useTripView } from './hooks/useTripView';
import { ParsedActivityRecommendation, ParsedTrip } from './types';

interface TripPageClientProps {
  trip: ParsedTrip;
  shelves: {
    title: string;
    type: string;
    activities: ParsedActivityRecommendation[];
  }[];
}

export function TripPageClient({ trip, shelves }: TripPageClientProps) {
  const { view, setView, totalActivities, initialize } = useTripView();

  useEffect(() => {
    initialize(trip.activities.length);
  }, [initialize, trip.activities.length]);
  const recommendedMin =
    Math.ceil(
      (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    ) * 4;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          {/* Back Link */}
          <div className="py-3">
            <Link
              href="/trips"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Trips
            </Link>
          </div>

          {/* Trip Info with Inline Progress */}
          <div className="flex items-center justify-between pb-4">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold">Trip to {trip.destination}</h1>
              <div className="gap-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {format(trip.startDate, 'MMM d')} - {format(trip.endDate, 'MMM d, yyyy')}
                </div>
              </div>
            </div>

            {view === 'recommendations' && (
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-800 rounded-full">
                  <span className="font-medium">{totalActivities}</span>
                  <span className="text-blue-600">selected</span>
                </div>
                <div className="text-gray-500">
                  {recommendedMin - totalActivities > 0 ? (
                    <span>Add {recommendedMin - totalActivities} more recommended</span>
                  ) : (
                    <span className="text-green-600">Ready to organize!</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center">
            {['Browse Activities', 'Itinerary'].map(tab => (
              <button
                key={tab}
                className={cn(
                  'px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2',
                  view === (tab === 'Browse Activities' ? 'recommendations' : 'itinerary')
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                )}
                onClick={() =>
                  setView(tab === 'Browse Activities' ? 'recommendations' : 'itinerary')
                }
              >
                {tab}
                {tab === 'Itinerary' && totalActivities > 0 && view === 'recommendations' && (
                  <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                    {totalActivities}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Views */}
      {view === 'recommendations' ? (
        <RecommendationsView
          shelves={shelves}
          tripId={trip.id}
          existingActivityIds={trip.activities.map(a => a.recommendationId)}
        />
      ) : (
        <ItineraryView trip={trip} activities={trip.activities} />
      )}
    </main>
  );
}
