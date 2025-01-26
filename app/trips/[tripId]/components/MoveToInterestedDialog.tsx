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

interface MoveToInterestedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  activity: ParsedItineraryActivity | null;
}

export function MoveToInterestedDialog({ isOpen, onClose, activity }: MoveToInterestedDialogProps) {
  const [isMoving, setIsMoving] = useState(false);
  const { updateActivity } = useActivityMutations();

  if (!activity) return null;

  const handleMove = async (event: React.MouseEvent) => {
    event.preventDefault();
    setIsMoving(true);

    try {
      await updateActivity.mutateAsync({
        activityId: activity.id,
        updates: {
          status: 'interested',
        },
      });
      toast.success('Activity moved to interested');
      onClose();
    } catch (error) {
      console.error('Move to interested error:', error);
      toast.error('Failed to move activity', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsMoving(false);
    }
  };

  const handleOpenChange = () => {
    // Prevent closing while move is in progress
    if (!isMoving) {
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Move to Interested</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to move <b>{activity.recommendation.name}</b> to your interested
            list?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">
              This will remove the activity from your trip schedule, but you can easily add it back
              later from your interested list.
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isMoving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleMove}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isMoving}
          >
            {isMoving ? 'Moving...' : 'Move to Interested'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
