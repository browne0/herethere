'use client';
import { Trip } from '@prisma/client';
import { format } from 'date-fns';
import Link from 'next/link';

import { PlacePhotos } from '../places/PlacePhotos';

interface TripCardProps {
  trip: Trip;
}

export const TripCard = ({ trip }: TripCardProps) => {
  return (
    <Link href={`/trips/${trip.id}`} className="group block">
      <div className="flex rounded-lg overflow-hidden border hover:shadow-lg transition-shadow bg-white">
        <div className="flex-1 p-6">
          <h2 className="text-xl font-semibold mb-2">{trip.title}</h2>
          <p className="text-muted-foreground mb-3">{trip.destination}</p>
          <div className="text-sm text-muted-foreground">
            <p>
              {format(new Date(trip.startDate), 'MMM d, yyyy')} -{' '}
              {format(new Date(trip.endDate), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <div className="relative w-[200px] h-[200px]">
          {trip.placeId && (
            <PlacePhotos
              placeId={trip.placeId}
              className="!absolute inset-0"
              maxPhotos={1}
              aspectRatio="square"
            />
          )}
        </div>
      </div>
    </Link>
  );
};
