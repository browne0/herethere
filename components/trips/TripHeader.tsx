'use client';
import { format } from 'date-fns';
import { CalendarDays, MapPin, Star, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { CityPhoto } from '@/components/photos/CityPhoto';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { DemoTrip } from '@/lib/types';

interface TripHeaderProps {
  trip: DemoTrip;
  onSignUpClick: () => void;
}

export function TripHeader({ trip }: TripHeaderProps) {
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

  return (
    <div className="relative">
      {/* Back button - Positioned absolutely over the photo */}
      <div className="absolute left-4 lg:left-8 top-6 z-10">
        <Button variant="secondary" size="sm" className="shadow-md" asChild>
          <Link href="/" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>

      {/* Hero Image */}
      <div className="relative h-48 md:h-64 overflow-hidden">
        <CityPhoto city={trip.cityData.name} />
      </div>

      {/* Content overlapping the image */}
      <div className="relative -mt-24 px-6 pb-6">
        <Card className="backdrop-blur-md bg-background/95">
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold">Your Next {trip.cityData.name} Adventure</h1>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Dates */}
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Trip Dates</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(trip.preferences.dates.from!), 'MMM d')} -{' '}
                    {format(new Date(trip.preferences.dates.to!), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              {/* Trip Vibe */}
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Trip Style</p>
                  <p className="text-sm text-muted-foreground">
                    {getTripVibe(trip.preferences.tripVibe)} •{' '}
                    {getPaceDescription(trip.preferences.pace)}
                  </p>
                </div>
              </div>

              {/* Dietary Preferences if any */}
              {trip.preferences.dietary.length > 0 ? (
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Dietary Preferences</p>
                    <p className="text-sm text-muted-foreground">
                      {trip.preferences.dietary.join(', ')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Dietary Preferences</p>
                    <p className="text-sm text-muted-foreground">No preferences</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
