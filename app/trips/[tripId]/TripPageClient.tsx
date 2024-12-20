'use client';

import { useEffect, useState } from 'react';

import { User } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { useActivitiesStore } from '@/lib/stores/activitiesStore';

import { ItineraryView } from './components/ItineraryView';
import { RecommendationsView } from './components/RecommendationsView';
import { useTripView } from './hooks/useTripView';
import { ActivityShelfType, ParsedTrip } from './types';
import { DeleteTripDialog } from '../components/DeleteTripDialog';
import TripHeader from './components/TripHeader';

interface TripPageClientProps {
  trip: ParsedTrip;
  shelves: ActivityShelfType[];
  user: User;
}

export function TripPageClient({ trip, shelves, user }: TripPageClientProps) {
  const router = useRouter();
  const { view, initialize } = useTripView();
  const { setActivities, setTripId } = useActivitiesStore();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    initialize('recommendations');
  }, [initialize]);

  // Initialize store with trip activities
  useEffect(() => {
    setActivities(trip.activities);
    setTripId(trip.id);
  }, [trip.activities, setActivities, setTripId, trip.id]);

  const handleDeleteTrip = async (tripId: string) => {
    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete trip');

      toast.success('Trip deleted', {
        description: 'Your trip has been successfully deleted.',
      });

      router.push('/trips');
    } catch (_error) {
      toast.error('Error', {
        description: 'Failed to delete trip. Please try again.',
      });
    }
  };

  return (
    <main className="bg-white">
      <TripHeader trip={trip} user={user} onDeleteClick={() => setIsDeleteDialogOpen(true)} />

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
