'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import { City } from '@/lib/types';
import { cn } from '@/lib/utils';
import { TripFormData, tripFormSchema } from '@/lib/validations/trip';

import { CitySearch } from '../maps/CitySearch';

interface TripFormProps {
  initialData?: {
    id: string;
    title: string;
    destination: string;
    startDate: Date;
    endDate: Date;
  };
}

export function TripForm({ initialData }: TripFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);

  const form = useForm<TripFormData>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: {
      title: initialData?.title ?? '',
      destination: initialData?.destination ?? '',
      startDate: initialData?.startDate ?? undefined,
      endDate: initialData?.endDate ?? undefined,
    },
  });

  async function onSubmit(values: TripFormData) {
    try {
      setLoading(true);

      if (!selectedCity) {
        console.log('No city selected');
        throw new Error('Please select a destination city');
      }

      const payload: TripFormData = {
        ...values,
        cityBounds: selectedCity.bounds,
        placeId: selectedCity.placeId,
        latitude: selectedCity.latitude,
        longitude: selectedCity.longitude,
      };

      const url = initialData ? `/api/trips/${initialData.id}` : '/api/trips';

      const method = initialData ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      router.push('/trips');
      router.refresh();
    } catch (error) {
      console.error('Error saving trip:', error);
      alert(error instanceof Error ? error.message : 'Failed to save trip');
    } finally {
      setLoading(false);
    }
  }

  const handleCitySelect = (city: City) => {
    setSelectedCity(city);
    form.setValue('destination', city.name);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Trip Title</FormLabel>
              <FormControl>
                <Input placeholder="Summer Vacation 2024" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="destination"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Destination</FormLabel>
              <CitySearch onCitySelect={handleCitySelect} defaultValue={field.value} />
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
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
        </div>
        <Button type="submit" disabled={loading}>
          {loading
            ? initialData
              ? 'Saving...'
              : 'Creating...'
            : initialData
              ? 'Save Changes'
              : 'Create Trip'}
        </Button>
      </form>
    </Form>
  );
}
