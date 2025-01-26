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
import { useActivityMutations } from '@/lib/stores/activitiesStore';
import { useState } from 'react';
import { toast } from 'sonner';
import { ParsedItineraryActivity } from '../types';

interface DeleteActivityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  activity: ParsedItineraryActivity | null;
}

export function DeleteActivityDialog({ isOpen, onClose, activity }: DeleteActivityDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { removeActivity } = useActivityMutations();

  if (!activity) return null;

  const handleDelete = async (event: React.MouseEvent) => {
    event.preventDefault();
    setIsDeleting(true);

    try {
      await removeActivity.mutateAsync(activity.id);
      toast.success('Activity removed');
      onClose();
    } catch (_error) {
      toast.error('Failed to remove activity');
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
          <AlertDialogTitle>Remove Activity</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove <b>{activity.recommendation.name}</b> from your trip?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{activity.recommendation.name}</span>
          </div>
          {activity.status === 'planned' && activity.startTime && (
            <p className="text-sm text-red-600">
              All information, including your notes, will be permanently deleted.
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={isDeleting}
          >
            {isDeleting ? 'Removing...' : 'Remove'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
