'use client';

import React from 'react';

import { DialogTitle } from '@radix-ui/react-dialog';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useActivitiesStore } from '@/lib/stores/activitiesStore';

import { ParsedTrip } from '../types';

interface TripTitleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateTrip: (updatedTrip: ParsedTrip) => void;
}

export default function TripTitleModal({ isOpen, onClose, onUpdateTrip }: TripTitleModalProps) {
  const { trip } = useActivitiesStore();
  const [title, setTitle] = React.useState(trip?.title ?? '');

  const hasChanges = React.useMemo(() => {
    if (!trip) return false;
    return title !== trip.title;
  }, [title, trip]);

  const updateTripMutation = useMutation({
    mutationFn: async () => {
      if (!trip || !title.trim()) {
        throw new Error('Missing required data');
      }

      const response = await fetch(`/api/trips/${trip.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
        }),
      });

      if (!response.ok) throw new Error('Failed to update trip');
      return response.json();
    },
    onSuccess: async data => {
      await onUpdateTrip(data);
      onClose();
      toast.success('Trip title updated successfully');
    },
    onError: () => {
      toast.error('Failed to update trip title');
    },
  });

  React.useEffect(() => {
    if (isOpen && trip) {
      setTitle(trip.title);
    }
  }, [isOpen, trip]);

  const handleSave = () => {
    if (!title.trim()) return;
    updateTripMutation.mutate();
  };

  if (!trip) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Trip Name</DialogTitle>
          <DialogDescription className="sr-only">Edit your trip's title.</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Trip Name</label>
            <Input
              placeholder="Name your trip"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="max-w-lg"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim() || updateTripMutation.isPending || !hasChanges}
          >
            {updateTripMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {updateTripMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
