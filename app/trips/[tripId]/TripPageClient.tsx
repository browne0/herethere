'use client';

import { useEffect, useState } from 'react';

import { ActivityRecommendation } from '@prisma/client';
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
import { ParsedTrip } from './types';
import { DeleteTripDialog } from '../components/DeleteTripDialog';
import TripHeader from './components/TripHeader';

interface TripPageClientProps {
  trip: ParsedTrip;
  shelves: {
    title: string;
    type: string;
    activities: ActivityRecommendation[];
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
    <main className="bg-white">
      <TripHeader trip={trip} onDeleteClick={() => setIsDeleteDialogOpen(true)} />

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
