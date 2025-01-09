import { useState } from 'react';

import { format } from 'date-fns';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { ParsedTrip } from '../[tripId]/types';

interface DeleteTripDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: (tripId: string) => Promise<void>;
  trip: ParsedTrip | null;
}

export function DeleteTripDialog({ isOpen, onClose, onDelete, trip }: DeleteTripDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!trip) return null;

  const handleDelete = async (event: React.MouseEvent) => {
    event.preventDefault();
    setIsDeleting(true);

    try {
      await onDelete(trip.id);
      // Only close the dialog after successful deletion
      onClose();
    } catch (_error) {
      // Error is handled in parent component
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = () => {
    // Prevent closing while delete is in progress
    if (!isDeleting) {
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Trip</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete your trip to {trip.city.name}?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{trip.title}</span>
              <span className="text-sm text-gray-500">
                {format(trip.startDate, 'MMM d')} - {format(trip.endDate, 'MMM d, yyyy')}
              </span>
            </div>
            {trip.activities.length > 0 && (
              <p className="text-sm text-red-600">
                This will also delete {trip.activities.length} planned{' '}
                {trip.activities.length === 1 ? 'activity' : 'activities'}.
              </p>
            )}
          </div>

          <p className="text-sm text-gray-500">
            This action cannot be undone. This will permanently delete all trip data and activities.
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Trip'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
