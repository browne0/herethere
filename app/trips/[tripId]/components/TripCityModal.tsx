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

interface TripCityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateTrip: (updatedTrip: ParsedTrip) => void;
}

export default function TripCityModal({ isOpen, onClose, onUpdateTrip }: TripCityModalProps) {
  const { trip } = useActivitiesStore();

  const [title, setTitle] = React.useState(trip?.title ?? '');
  const [city, setCity] = React.useState(trip?.city ?? null);

  const hasChanges = React.useMemo(() => {
    if (!trip || !city) return false;
    return title !== trip.title || city.id !== trip.city.id;
  }, [title, city, trip]);

  const updateTripMutation = useMutation({
    mutationFn: async (updatedData: Partial<ParsedTrip>) => {
      if (!trip) throw new Error('No trip found');

      const response = await fetch(`/api/trips/${trip.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) throw new Error('Failed to update trip');
      return response.json();
    },
    onSuccess: async data => {
      await onUpdateTrip(data);
      await onClose();
      toast.success('Trip updated successfully');
    },
    onError: () => {
      toast.error('Failed to update trip');
    },
  });

  React.useEffect(() => {
    if (isOpen && trip) {
      setTitle(trip.title);
      setCity(trip.city);
    }
  }, [isOpen, trip]);

  const handleSave = () => {
    if (!trip || !city || !title.trim()) return;

    updateTripMutation.mutate({
      cityId: city.id,
      title: title.trim(),
    });
  };

  if (!trip || !city) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl focus:outline-none">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>
              Unable to load trip details. Please try again later.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 sm:h-auto max-h-[90vh] flex flex-col focus-visible:ring-0">
        <DialogHeader className="flex justify-between border-b p-4 bg-white rounded-t-lg">
          <DialogTitle className="text-lg font-semibold text-center sm:text-left">
            Trip Details
          </DialogTitle>
          <DialogDescription className="sr-only">Edit your trip's details</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-6 space-y-6">
            {/* Trip Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Trip Name</label>
              <Input
                placeholder="Name your trip"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="max-w-lg"
              />
            </div>

            {/* City Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Destination</label>
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium">{city.name}</h3>
                <p className="text-sm text-gray-500">City changes coming soon</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t rounded-b-lg p-4 bg-white mt-auto">
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={onClose} className="hidden sm:inline-flex">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!title.trim() || updateTripMutation.isPending || !hasChanges}
              className="flex-1 sm:flex-none"
            >
              {updateTripMutation.isPending && (
                <Loader2 className="w-2.5 h-2.5 animate-spin mr-2" />
              )}
              {updateTripMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
