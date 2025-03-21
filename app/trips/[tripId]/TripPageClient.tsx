'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { useActivitiesStore } from '@/lib/stores/activitiesStore';

import { DeleteTripDialog } from '../components/DeleteTripDialog';
import DateEditModal from './components/DateEditModal';
import { DeleteActivityDialog } from './components/DeleteActivityDialog';
import { MoveToInterestedDialog } from './components/MoveToInterestedDialog';
import { RecommendationsView } from './components/RecommendationsView/RecommendationsView';
import TripCityModal from './components/TripCityModal';
import TripEditModal from './components/TripEditModal';
import TripHeader from './components/TripHeader';
import TripTitleModal from './components/TripTitleModal';
import { ActivityCategoryType, ParsedItineraryActivity, ParsedTrip } from './types';

interface TripPageClientProps {
  trip: ParsedTrip;
  categories: ActivityCategoryType[];
}

export function TripPageClient({ trip, categories }: TripPageClientProps) {
  const router = useRouter();
  const { setTrip, setCategories } = useActivitiesStore();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState<ParsedItineraryActivity | null>(null);
  const [activityToMove, setActivityToMove] = useState<ParsedItineraryActivity | null>(null);

  // Initialize store with trip activities
  useEffect(() => {
    setTrip(trip);
    setCategories(categories);
  }, [setCategories, setTrip, categories, trip]);

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

  const handleTripUpdate = (updatedTrip: ParsedTrip) => {
    // Update local store
    setTrip({ ...trip, ...updatedTrip });
    // Refresh the page data
    router.refresh();
  };

  return (
    <div className="bg-white">
      <TripHeader
        onEditClick={() => setIsEditModalOpen(true)}
        onDateClick={() => setIsDateModalOpen(true)}
        onCityClick={() => setIsCityModalOpen(true)}
        onTitleClick={() => setIsTitleModalOpen(true)}
      />
      <RecommendationsView
        onDeleteClick={() => setIsDeleteDialogOpen(true)}
        onActivityDelete={setActivityToDelete}
      />
      <DeleteTripDialog
        trip={trip}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onDelete={handleDeleteTrip}
      />
      <TripEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdateTrip={handleTripUpdate}
      />
      <DateEditModal
        isOpen={isDateModalOpen}
        onClose={() => setIsDateModalOpen(false)}
        onUpdateTrip={handleTripUpdate}
      />
      <TripCityModal
        isOpen={isCityModalOpen}
        onClose={() => setIsCityModalOpen(false)}
        onUpdateTrip={handleTripUpdate}
      />
      <TripTitleModal
        isOpen={isTitleModalOpen}
        onClose={() => setIsTitleModalOpen(false)}
        onUpdateTrip={handleTripUpdate}
      />
      <DeleteActivityDialog
        isOpen={activityToDelete !== null}
        onClose={() => setActivityToDelete(null)}
        activity={activityToDelete}
      />
      <MoveToInterestedDialog
        isOpen={activityToMove !== null}
        onClose={() => setActivityToMove(null)}
        activity={activityToMove}
      />
    </div>
  );
}
