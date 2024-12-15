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
  trip: ParsedTrip | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (tripId: string) => Promise<void>;
}

export function DeleteTripDialog({ trip, isOpen, onClose, onDelete }: DeleteTripDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!trip) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(trip.id);
      onClose();
    } catch (_error) {
      // Error is handled in parent component
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
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
              <span className="text-sm font-medium">{trip.city.name}</span>
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
          <AlertDialogCancel>Cancel</AlertDialogCancel>
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
