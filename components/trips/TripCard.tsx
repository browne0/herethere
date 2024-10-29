// components/trips/TripCard.tsx

'use client';
import { Trip } from '@prisma/client';
import { format, differenceInDays, isAfter, isBefore, isToday } from 'date-fns';
import { Calendar, MapPin, MoreVertical } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getTripTimingText } from '@/lib/utils';

import { CityPhoto } from '../photos/CityPhoto';

interface TripCardProps {
  trip: Trip & {
    activities?: any[];
  };
}

export function TripCard({ trip }: TripCardProps) {
  const tripDuration = differenceInDays(new Date(trip.endDate), new Date(trip.startDate)) + 1;
  const now = new Date();
  const isActive =
    (isBefore(new Date(trip.startDate), now) || isToday(new Date(trip.startDate))) &&
    (isAfter(new Date(trip.endDate), now) || isToday(new Date(trip.endDate)));
  const tripTiming = getTripTimingText(trip.startDate, trip.endDate);

  return (
    <Card className="group hover:shadow-lg transition-all">
      <CardHeader className="p-0">
        <div className="relative h-48 overflow-hidden rounded-t-lg">
          {trip.placeId ? (
            <CityPhoto
              city={trip.destination}
              placeId={trip.placeId}
              className="w-full h-full"
              height="auto"
              showLoadingState={true}
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/60" />
          <div className="absolute top-4 right-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Link href={`/trips/${trip.id}/edit`} className="w-full">
                    Edit Trip
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>Share Trip</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">Delete Trip</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="text-lg font-semibold text-white mb-1">
              {trip.title || `Trip to ${trip.destination}`}
            </h3>
            <div className="flex items-center gap-2 text-white/90 text-sm">
              <MapPin className="h-4 w-4" />
              {trip.destination}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm">
                {format(new Date(trip.startDate), 'MMM d')} -{' '}
                {format(new Date(trip.endDate), 'MMM d, yyyy')}
              </span>
            </div>
            <Badge variant={tripTiming.variant}>{isActive ? 'Active' : tripTiming.text}</Badge>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div>
              {tripDuration} {tripDuration === 1 ? 'day' : 'days'}
            </div>
            <div>•</div>
            <div>
              {trip.activities?.length || 0}{' '}
              {(trip.activities?.length || 0) === 1 ? 'activity' : 'activities'}
            </div>
          </div>

          <Button asChild className="w-full">
            <Link href={`/trips/${trip.id}`}>View Trip</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
