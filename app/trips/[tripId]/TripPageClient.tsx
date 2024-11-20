'use client';

import { useState } from 'react';

import { Trip } from '@prisma/client';
import { format } from 'date-fns';
import { Calendar, ChevronLeft, MapPin, Users } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

import { ItineraryView } from './components/ItineraryView';
import { RecommendationsView } from './components/RecommendationsView';
import { ParsedActivityRecommendation, ParsedItineraryActivity } from './types';

interface TripPageClientProps {
  trip: Trip & {
    activities: ParsedItineraryActivity[];
  };
  shelves: {
    title: string;
    type: string;
    activities: ParsedActivityRecommendation[];
  }[];
}

export function TripPageClient({ trip, shelves }: TripPageClientProps) {
  const [view, setView] = useState<'recommendations' | 'itinerary'>('recommendations');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSelectedOpen, setIsSelectedOpen] = useState(false);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Main Header - Always visible */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Back Link - Above everything else */}
          <div className="py-3">
            <Link
              href="/trips"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Trips
            </Link>
          </div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center text-gray-600 text-sm">
              <MapPin className="w-4 h-4 mr-1" />
              <span>{trip.destination}</span>
            </div>
            <div className="flex items-center text-gray-600 text-sm">
              <Calendar className="w-4 h-4 mr-1" />
              <span>
                {format(trip.startDate, 'MMM d')} - {format(trip.endDate, 'MMM d, yyyy')}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">
              {view === 'recommendations'
                ? `Trip to ${trip.destination}`
                : `Your ${trip.destination} Itinerary`}
            </h1>
            <div className="flex items-center gap-1">
              {[1, 2].map(i => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center"
                >
                  <Users className="w-3 h-3 text-blue-600" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-t border-b flex items-center">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center">
            {['Browse Activities', 'Itinerary'].map(tab => (
              <button
                key={tab}
                className={cn(
                  'px-4 py-4 text-sm font-medium border-b-2 transition-colors',
                  view === (tab === 'Browse Activities' ? 'recommendations' : 'itinerary')
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                )}
                onClick={() =>
                  setView(tab === 'Browse Activities' ? 'recommendations' : 'itinerary')
                }
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Views */}
      {view === 'recommendations' ? (
        <>
          <RecommendationsView
            shelves={shelves}
            tripId={trip.id}
            existingActivityIds={trip.activities.map(a => a.recommendationId)}
            preferences={trip.preferences}
          />
        </>
      ) : (
        <ItineraryView trip={trip} activities={trip.activities} />
      )}
    </main>
  );
}
