'use client';

import React from 'react';

import { DialogTitle } from '@radix-ui/react-dialog';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import ResponsiveMultiSelect from '@/app/onboarding/dietary/ResponsiveMultiSelect';
import DateRangePicker from '@/components/DateRangePicker';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BUDGET_OPTIONS, CUISINE_PREFERENCES, DIETARY_RESTRICTIONS } from '@/constants';
import { useActivitiesStore } from '@/lib/stores/activitiesStore';
import { DietaryRestriction } from '@/lib/stores/preferences';

import { ParsedTrip, TripBudget } from '../types';

interface TripEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateTrip: (updatedTrip: ParsedTrip) => void;
}

export default function TripEditModal({ isOpen, onClose, onUpdateTrip }: TripEditModalProps) {
  const { trip } = useActivitiesStore();

  // All hooks must be called before any conditional returns
  const [title, setTitle] = React.useState(trip?.title ?? '');
  const [city, setCity] = React.useState(trip?.city ?? null);
  const [selectedDates, setSelectedDates] = React.useState({
    startDate: trip?.startDate ? new Date(trip.startDate) : null,
    endDate: trip?.endDate ? new Date(trip.endDate) : null,
  });

  const [budget, setBudget] = React.useState<TripBudget>(trip?.preferences?.budget || 'moderate');
  const [dietaryRestrictions, setDietaryRestrictions] = React.useState<DietaryRestriction[]>(
    trip?.preferences?.dietaryRestrictions || []
  );
  const [cuisinePreferences, setCuisinePreferences] = React.useState({
    preferred: trip?.preferences?.cuisinePreferences?.preferred || [],
    avoided: trip?.preferences?.cuisinePreferences?.avoided || [],
  });

  const hasChanges = React.useMemo(() => {
    if (!trip || !city) return false;

    const originalStartDate = trip.startDate ? new Date(trip.startDate) : null;
    const originalEndDate = trip.endDate ? new Date(trip.endDate) : null;

    return (
      title !== trip.title ||
      city.id !== trip.city.id ||
      selectedDates.startDate?.toDateString() !== originalStartDate?.toDateString() ||
      selectedDates.endDate?.toDateString() !== originalEndDate?.toDateString() ||
      budget !== trip.preferences?.budget ||
      JSON.stringify(dietaryRestrictions) !==
        JSON.stringify(trip.preferences?.dietaryRestrictions) ||
      JSON.stringify(cuisinePreferences) !== JSON.stringify(trip.preferences?.cuisinePreferences)
    );
  }, [title, city, selectedDates, budget, dietaryRestrictions, cuisinePreferences, trip]);

  const updateTripMutation = useMutation({
    mutationFn: async (updatedData: Partial<ParsedTrip>) => {
      if (!trip) throw new Error('No trip found');

      const response = await fetch(`/api/trips/${trip.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updatedData,
          preferences: {
            ...trip.preferences,
            budget,
            dietaryRestrictions,
            cuisinePreferences,
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to update trip');
      return response.json();
    },
    onSuccess: data => {
      onUpdateTrip(data);
      onClose();
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
      setSelectedDates({
        startDate: trip.startDate ? new Date(trip.startDate) : null,
        endDate: trip.endDate ? new Date(trip.endDate) : null,
      });
      setBudget(trip.preferences?.budget || 'moderate');
      setDietaryRestrictions(trip.preferences?.dietaryRestrictions || []);
      setCuisinePreferences({
        preferred: trip.preferences?.cuisinePreferences?.preferred || [],
        avoided: trip.preferences?.cuisinePreferences?.avoided || [],
      });
    }
  }, [isOpen, trip]);

  const handleSave = () => {
    if (!trip || !city || !selectedDates.startDate || !selectedDates.endDate || !title.trim())
      return;

    updateTripMutation.mutate({
      startDate: selectedDates.startDate,
      endDate: selectedDates.endDate,
      cityId: city.id,
      title: title.trim(),
    });
  };

  // After all hooks, we can do conditional rendering
  if (!trip || !city) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl">
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
      <DialogContent className="sm:max-w-2xl p-0 gap-0 sm:h-auto max-h-[90vh] flex flex-col">
        <DialogHeader className="flex justify-between border-b p-4 bg-white rounded-t-lg">
          <DialogTitle className="text-lg font-semibold text-center sm:text-left">
            Your Trip Details
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

            {/* Budget Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Budget Level</label>
              <Select value={budget} onValueChange={(value: TripBudget) => setBudget(value)}>
                <SelectTrigger className="max-w-lg">
                  <SelectValue placeholder="Select your budget level" />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dietary Restrictions */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Dietary Restrictions</label>
              <ResponsiveMultiSelect<DietaryRestriction>
                options={DIETARY_RESTRICTIONS}
                selected={dietaryRestrictions}
                onChange={setDietaryRestrictions}
                placeholder="Select any dietary restrictions"
                title="Dietary Restrictions"
                searchPlaceholder="Search restrictions..."
                type="dietary"
                entity="dietary restrictions"
              />
            </div>

            {/* Cuisines Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Favorite Cuisines</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2 border rounded-lg p-3">
                {CUISINE_PREFERENCES.map(cuisine => (
                  <div key={cuisine.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={cuisine.value}
                      checked={cuisinePreferences.preferred.includes(cuisine.value)}
                      onCheckedChange={checked => {
                        const newPreferred = checked
                          ? [...cuisinePreferences.preferred, cuisine.value]
                          : cuisinePreferences.preferred.filter(c => c !== cuisine.value);
                        setCuisinePreferences({
                          ...cuisinePreferences,
                          preferred: newPreferred,
                        });
                      }}
                    />
                    <label
                      htmlFor={cuisine.value}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {cuisine.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* City Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Destination</label>
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium">{city.name}</h3>
                <p className="text-sm text-gray-500">City changes coming soon</p>
              </div>
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Dates</label>
              <DateRangePicker
                startDate={selectedDates.startDate}
                endDate={selectedDates.endDate}
                onChange={setSelectedDates}
                minDate={new Date()}
              />
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
              disabled={
                !selectedDates.startDate ||
                !selectedDates.endDate ||
                !title.trim() ||
                updateTripMutation.isPending ||
                !hasChanges
              }
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
