'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useActivitiesStore } from '@/lib/stores/activitiesStore';
import { RecommendationsView } from './components/RecommendationsView';
import { ActivityCategoryType, ParsedTrip } from './types';
import { DeleteTripDialog } from '../components/DeleteTripDialog';
import TripHeader from './components/TripHeader';
import TripEditModal from './components/TripEditModal';

interface TripPageClientProps {
  trip: ParsedTrip;
  categories: ActivityCategoryType[];
}

export function TripPageClient({ trip, categories }: TripPageClientProps) {
  const router = useRouter();
  const { setActivities, setTrip } = useActivitiesStore();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Initialize store with trip activities
  useEffect(() => {
    setActivities(trip.activities);
    setTrip(trip);
  }, [trip.activities, setActivities, setTrip, trip.id]);

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

  const handleTripUpdate = (updatedTrip: Partial<ParsedTrip>) => {
    // Update local store
    setTrip({ ...trip, ...updatedTrip });
    // Refresh the page data
    router.refresh();
  };

  return (
    <div className="bg-white">
      <TripHeader
        trip={trip}
        onDeleteClick={() => setIsDeleteDialogOpen(true)}
        onEditClick={() => setIsEditModalOpen(true)}
      />
      <RecommendationsView
        categories={categories}
        onDeleteClick={() => setIsDeleteDialogOpen(true)}
        trip={trip}
      />
      <DeleteTripDialog
        trip={trip}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDelete={handleDeleteTrip}
      />

      <TripEditModal
        trip={trip}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdateTrip={handleTripUpdate}
      />
    </div>
  );
}
