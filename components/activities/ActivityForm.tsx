// components/activities/ActivityForm.tsx
'use client';

import { useState, useCallback } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Activity } from '@prisma/client';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { LocationSearch } from '@/components/maps/LocationSearch';
import { MapDisplay } from '@/components/maps/MapDisplay';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Location } from '@/lib/types';
import { cn } from '@/lib/utils';
import { activityFormSchema, type ActivityFormValues } from '@/lib/validations/activity';

interface ActivityFormProps {
  tripId: string;
  initialData?: Activity;
  onCancel?: () => void;
}

export const ActivityForm: React.FC<ActivityFormProps> = ({ tripId, initialData, onCancel }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(() => {
    if (!initialData?.address || !initialData?.latitude || !initialData?.longitude) {
      return null;
    }

    return {
      address: initialData.address || '',
      latitude: initialData.latitude || 0,
      longitude: initialData.longitude || 0,
      placeId: initialData.placeId || undefined,
      name: initialData.name,
    };
  });

  const [selectedCity, setSelectedCity] = useState<{
    bounds?: {
      ne: { lat: number; lng: number };
      sw: { lat: number; lng: number };
    };
  } | null>(null);

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          type: initialData.type as ActivityFormValues['type'],
          address: initialData.address || '',
          latitude: initialData.latitude || 0,
          longitude: initialData.longitude || 0,
          placeId: initialData.placeId || undefined,
          startDate: new Date(initialData.startTime),
          endDate: new Date(initialData.endTime),
          startTime: format(new Date(initialData.startTime), 'HH:mm'),
          endTime: format(new Date(initialData.endTime), 'HH:mm'),
          notes: initialData.notes || '',
        }
      : {
          name: '',
          type: 'DINING',
          address: '',
          latitude: 0,
          longitude: 0,
          startTime: '09:00',
          endTime: '10:00',
          notes: '',
          startDate: new Date(),
          endDate: new Date(),
        },
  });

  const handleLocationSelect = useCallback(
    (location: Location) => {
      setSelectedLocation(location);
      form.setValue('name', location.name || location.address.split(',')[0], {
        shouldValidate: true,
      });
      form.setValue('address', location.address, { shouldValidate: true });
      form.setValue('latitude', location.latitude, { shouldValidate: true });
      form.setValue('longitude', location.longitude, { shouldValidate: true });
      form.setValue('placeId', location.placeId);
    },
    [form]
  );

  // Watch location fields for the hasLocation check
  const latitude = form.watch('latitude');
  const longitude = form.watch('longitude');
  const hasLocation = latitude !== 0 && longitude !== 0;

  const onSubmit = async (data: ActivityFormValues) => {
    try {
      setLoading(true);

      const startDateTime = new Date(data.startDate);
      const [startHours, startMinutes] = data.startTime.split(':');
      startDateTime.setHours(parseInt(startHours), parseInt(startMinutes));

      const endDateTime = new Date(data.endDate);
      const [endHours, endMinutes] = data.endTime.split(':');
      endDateTime.setHours(parseInt(endHours), parseInt(endMinutes));

      if (endDateTime <= startDateTime) {
        form.setError('endTime', {
          type: 'manual',
          message: 'End time must be after start time',
        });
        return;
      }

      const payload = {
        name: data.name,
        type: data.type,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        placeId: data.placeId,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        notes: data.notes,
      };

      const url = initialData
        ? `/api/trips/${tripId}/activities/${initialData.id}`
        : `/api/trips/${tripId}/activities`;

      const response = await fetch(url, {
        method: initialData ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      if (initialData && onCancel) {
        onCancel();
      } else {
        router.push(`/trips/${tripId}`);
      }
      router.refresh();
    } catch (error) {
      console.error('Error saving activity:', error);
      alert(error instanceof Error ? error.message : 'Failed to save activity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormItem>
          <FormLabel>Location Search</FormLabel>
          {selectedLocation && (
            <div className="text-sm text-muted-foreground mb-2">
              Selected: {selectedLocation.name || selectedLocation.address.split(',')[0]}
            </div>
          )}
          <LocationSearch
            onLocationSelect={handleLocationSelect}
            defaultValue={initialData?.address || undefined}
            searchType={form.watch('type')}
            cityBounds={selectedCity?.bounds}
          />
        </FormItem>

        {selectedLocation && (
          <Card className="p-4">
            <MapDisplay location={selectedLocation} zoom={16} />
          </Card>
        )}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Activity Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select activity type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="DINING">Dining</SelectItem>
                  <SelectItem value="SIGHTSEEING">Sightseeing</SelectItem>
                  <SelectItem value="ACCOMMODATION">Accommodation</SelectItem>
                  <SelectItem value="TRANSPORTATION">Transportation</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Start Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={date => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>End Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={date => date < form.watch('startDate') || date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={loading || !hasLocation}>
            {loading
              ? initialData
                ? 'Updating...'
                : 'Creating...'
              : initialData
                ? 'Update Activity'
                : 'Create Activity'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ActivityForm;
