'use client';

import { useEffect, useState } from 'react';

import { format } from 'date-fns';
import { Calendar, ChevronLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { toast } from '@/hooks/use-toast';
import { useActivitiesStore } from '@/lib/stores/activitiesStore';
import { cn } from '@/lib/utils';

import { ItineraryView } from './components/ItineraryView';
import { RecommendationsView } from './components/RecommendationsView';
import { useTripView } from './hooks/useTripView';
import { ParsedActivityRecommendation, ParsedTrip } from './types';
import { DeleteTripDialog } from '../components/DeleteTripDialog';

interface TripPageClientProps {
  trip: ParsedTrip;
  shelves: {
    title: string;
    type: string;
    activities: ParsedActivityRecommendation[];
  }[];
}

export function TripPageClient({ trip, shelves }: TripPageClientProps) {
  const router = useRouter();
  const { view, setView, initialize } = useTripView();
  const { setActivities, activities, setTripId } = useActivitiesStore();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    initialize('recommendations');
  }, [initialize]);

  // Initialize store with trip activities
  useEffect(() => {
    setActivities(trip.activities);
    setTripId(trip.id);
  }, [trip.activities, setActivities, setTripId, trip.id]);

  const recommendedMin =
    Math.ceil(
      (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    ) * 4;

  const handleDeleteTrip = async (tripId: string) => {
    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete trip');

      toast({
        title: 'Trip deleted',
        description: 'Your trip has been successfully deleted.',
      });

      router.push('/trips');
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'Failed to delete trip. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header Section */}
          <div className="flex items-center justify-between py-3">
            <Link
              href="/trips"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Trips
            </Link>

            <button
              onClick={() => setIsDeleteDialogOpen(true)}
              className="inline-flex items-center px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Trip
            </button>
          </div>

          {/* Trip Info with Inline Progress */}
          <div className="flex flex-col pb-4">
            <div className="space-y-2">
              <h1 className="text-xl font-semibold">Trip to {trip.city.name}</h1>
              <div className="text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {format(trip.startDate, 'MMM d')} - {format(trip.endDate, 'MMM d, yyyy')}
                </div>
              </div>
            </div>

            {view === 'recommendations' && (
              <div className="mt-4 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-3 text-sm">
                <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-800 rounded-full">
                  <span className="font-medium">{activities.length}</span>
                  <span className="text-blue-600">activities selected</span>
                </div>
                <div className="text-center sm:text-left text-gray-500">
                  {recommendedMin - activities.length > 0 ? (
                    <span>Add {recommendedMin - activities.length} more activities</span>
                  ) : (
                    <span className="text-green-600">Ready to go!</span>
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
                {tab === 'Itinerary' && activities.length > 0 && view === 'recommendations' && (
                  <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                    {activities.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Views */}
      {view === 'recommendations' ? (
        <RecommendationsView shelves={shelves} />
      ) : (
        <ItineraryView trip={trip} />
      )}
      <DeleteTripDialog
        trip={trip}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDelete={handleDeleteTrip}
      />
    </main>
  );
}
