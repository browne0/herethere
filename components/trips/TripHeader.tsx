// components/trips/TripHeader.tsx

'use client';
import { format } from 'date-fns';
import { CalendarDays, Star, Utensils, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { CityPhoto } from '@/components/photos/CityPhoto';
import { PlacePhotos } from '@/components/places/PlacePhotos';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { TripHeaderProps } from '@/lib/types';

export function TripHeader({ trip, showBackButton = true, className = '' }: TripHeaderProps) {
  const getTripVibe = (vibe: number) => {
    if (vibe > 75) return 'Adventurous';
    if (vibe > 25) return 'Balanced';
    return 'Relaxed';
  };

  const getPaceDescription = (pace: number) => {
    if (pace > 4) return 'Fast-paced';
    if (pace > 2) return 'Moderate';
    return 'Leisurely';
  };

  // Get preferences safely - handle both demo and live trips
  const preferences = 'preferences' in trip ? trip.preferences : null;
  const dates = preferences?.dates || {
    from: trip.startDate,
    to: trip.endDate,
  };
  const dietary = preferences?.dietary || [];
  const tripVibe = preferences?.tripVibe || 50;
  const pace = preferences?.pace || 3;

  return (
    <div className="relative">
      {/* Back button */}
      {showBackButton && (
        <div className="absolute left-4 lg:left-8 top-6 z-10">
          <Button variant="secondary" size="sm" className="shadow-md" asChild>
            <Link href="/" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>
      )}

      {/* Hero Image */}
      <div className={`relative h-64 overflow-hidden ${className}`}>
        {trip.placeId ? (
          <PlacePhotos
            placeId={trip.placeId}
            className="absolute inset-0 w-full h-full object-cover"
            maxPhotos={1}
          />
        ) : (
          <CityPhoto
            city={trip.destination}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/60" />
      </div>

      {/* Content overlapping the image */}
      <div className="relative -mt-24 px-4 lg:px-8">
        <Card className="backdrop-blur-md bg-background/95">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-6">
              {/* Title */}
              <div>
                <h1 className="text-2xl font-bold">
                  {trip.title || `Trip to ${trip.destination}`}
                </h1>
                <p className="text-muted-foreground">{trip.destination}</p>
              </div>

              {/* Trip Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Dates */}
                <div className="flex items-center gap-3">
                  <CalendarDays className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="font-medium">Trip Dates</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(dates.from as Date), 'MMM d')} -{' '}
                      {format(new Date(dates.to as Date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                {/* Trip Style */}
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="font-medium">Trip Style</p>
                    <p className="text-sm text-muted-foreground">
                      {getTripVibe(tripVibe)} • {getPaceDescription(pace)}
                    </p>
                  </div>
                </div>

                {/* Dietary Preferences */}
                <div className="flex items-center gap-3">
                  <Utensils className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="font-medium">Dietary Preferences</p>
                    <p className="text-sm text-muted-foreground">
                      {dietary.length > 0 ? dietary.join(', ') : 'No preferences'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
