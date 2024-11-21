import React, { useState } from 'react';

import { format } from 'date-fns';
import { Navigation, Trash2 } from 'lucide-react';

import { ParsedItineraryActivity } from '@/app/trips/[tripId]/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { getGoogleMapsDirectionsUrl } from '@/lib/maps/utils';
import { useActivitiesStore } from '@/lib/stores/activitiesStore';
import { cn } from '@/lib/utils';

interface ActivityTimelineItemProps {
  activity: ParsedItineraryActivity;
  nextActivity?: ParsedItineraryActivity;
  previousActivity?: ParsedItineraryActivity;
  onHover: (activityId: string | null) => void;
  onSelect: (activityId: string | null) => void;
  isHovered: boolean;
  isSelected: boolean;
  isFirstActivity: boolean;
  isLastActivity: boolean;
}

export function ActivityTimelineItem({
  activity,
  nextActivity,
  onHover,
  onSelect,
  isHovered,
  isSelected,
  isLastActivity,
}: ActivityTimelineItemProps) {
  const { recommendation } = activity;
  const { removeActivity, tripId } = useActivitiesStore();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/trips/${tripId}/activities/${activity.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to remove activity');

      // Update store
      removeActivity(activity.id);

      toast({
        title: 'Activity removed',
        description: 'The activity has been removed from your itinerary.',
      });
    } catch (error) {
      console.error('Error removing activity:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove activity. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="relative group">
      {/* Left Timeline */}
      <div className="absolute left-[11px] top-0 bottom-0 w-px bg-gray-100 group-hover:bg-primary/20 transition-colors" />

      {/* Timeline Dot */}
      <div
        className={cn(
          'absolute left-[7px] top-6 w-[9px] h-[9px] rounded-full transition-all duration-200',
          isSelected || isHovered ? 'bg-primary ring-4 ring-primary/20' : 'bg-gray-200'
        )}
      />

      {/* Activity Card */}
      <div
        className={cn('ml-8 py-6 transition-all duration-200')}
        onMouseEnter={() => onHover(activity.id)}
        onMouseLeave={() => onHover(null)}
        onClick={() => onSelect(activity.id)}
      >
        {/* Time Banner - Made More Prominent */}
        <div className="mb-4 text-sm font-medium text-gray-600">
          {format(new Date(activity.startTime), 'h:mm a')} -{' '}
          {format(new Date(activity.endTime), 'h:mm a')}
        </div>

        {/* Main Content Card */}
        <div
          className={cn(
            'p-4 rounded-lg border',
            isHovered && 'border-primary/20 bg-gray-50/80',
            // isSelected && 'border-primary bg-primary/5',
            'relative overflow-hidden'
          )}
        >
          {/* Delete Button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                onClick={e => e.stopPropagation()}
                className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 
                     px-2 py-1 rounded-md text-sm text-red-600 hover:bg-red-50 
                     transition-all flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove</span>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={e => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Activity</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove "{recommendation.name}" from your itinerary? This
                  action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-500 hover:bg-red-600 text-white"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Removing...' : 'Remove'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {/* Category Tag */}
          <div className="mb-3">
            <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
              {recommendation.category}
            </span>
          </div>

          {/* Title & Main Info */}
          <h4 className="text-lg font-medium leading-tight mb-2">{recommendation.name}</h4>

          {/* Location with Directions - Combined for Clarity */}
          <a
            href={getGoogleMapsDirectionsUrl(recommendation.location)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary mt-2 group/link"
          >
            <Navigation className="h-4 w-4" />
            <span className="line-clamp-1">{recommendation.location.address}</span>
          </a>

          {/* Notes if any */}
          {activity.notes && (
            <p className="text-sm text-gray-600 italic mt-3 pt-3 border-t">{activity.notes}</p>
          )}
        </div>

        {/* Next Activity Preview - Only if not last */}
        {!isLastActivity && nextActivity && (
          <div className="mt-4 pl-4 border-l-2 border-gray-200">
            <span className="text-xs text-gray-500">NEXT UP</span>
            <div className="text-sm text-gray-600 mt-1">
              {nextActivity.recommendation.name} at{' '}
              {format(new Date(nextActivity.startTime), 'h:mm a')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
