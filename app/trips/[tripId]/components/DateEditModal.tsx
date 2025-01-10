'use client';

import React from 'react';

import { DialogTitle } from '@radix-ui/react-dialog';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import DateRangePicker from '@/components/DateRangePicker';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { useActivitiesStore } from '@/lib/stores/activitiesStore';

import { ParsedTrip } from '../types';

interface DateEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateTrip: (updatedTrip: ParsedTrip) => void;
}

export default function DateEditModal({ isOpen, onClose, onUpdateTrip }: DateEditModalProps) {
  const { trip } = useActivitiesStore();

  const [selectedDates, setSelectedDates] = React.useState({
    startDate: trip?.startDate ? new Date(trip.startDate) : null,
    endDate: trip?.endDate ? new Date(trip.endDate) : null,
  });

  const hasChanges = React.useMemo(() => {
    if (!trip) return false;

    const originalStartDate = trip.startDate ? new Date(trip.startDate) : null;
    const originalEndDate = trip.endDate ? new Date(trip.endDate) : null;

    return (
      selectedDates.startDate?.toDateString() !== originalStartDate?.toDateString() ||
      selectedDates.endDate?.toDateString() !== originalEndDate?.toDateString()
    );
  }, [selectedDates, trip]);

  const updateTripMutation = useMutation({
    mutationFn: async () => {
      if (!trip || !selectedDates.startDate || !selectedDates.endDate) {
        throw new Error('Missing required data');
      }

      const response = await fetch(`/api/trips/${trip.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: selectedDates.startDate,
          endDate: selectedDates.endDate,
        }),
      });

      if (!response.ok) throw new Error('Failed to update trip');
      return response.json();
    },
    onSuccess: async data => {
      await onUpdateTrip(data);
      onClose();
      toast.success('Trip dates updated successfully');
    },
    onError: () => {
      toast.error('Failed to update trip dates');
    },
  });

  React.useEffect(() => {
    if (isOpen && trip) {
      setSelectedDates({
        startDate: trip.startDate ? new Date(trip.startDate) : null,
        endDate: trip.endDate ? new Date(trip.endDate) : null,
      });
    }
  }, [isOpen, trip]);

  const handleSave = () => {
    if (!selectedDates.startDate || !selectedDates.endDate) return;
    updateTripMutation.mutate();
  };

  if (!trip) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Trip Dates</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <DateRangePicker
            startDate={selectedDates.startDate}
            endDate={selectedDates.endDate}
            onChange={setSelectedDates}
            minDate={new Date()}
          />
        </div>

        <div className="flex justify-end gap-4 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedDates.startDate || !selectedDates.endDate || !hasChanges}
          >
            {updateTripMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {updateTripMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
