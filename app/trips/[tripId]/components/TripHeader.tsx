'use client';
import React from 'react';

import { SignedIn } from '@clerk/nextjs';
import { ChevronLeft, List } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { HereThereUserButton } from '@/components/nav';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';
import { useActivitiesStore } from '@/lib/stores/activitiesStore';

import { ActivitySheet } from './ActivitySheet';

interface TripHeaderProps {
  onEditClick: () => void;
}

export const TripHeader = ({ onEditClick }: TripHeaderProps) => {
  const { trip } = useActivitiesStore();
  const router = useRouter();
  const pathname = usePathname();

  const addedActivities = trip?.activities.filter(act => act.status === 'planned') ?? [];
  const interestedActivities = trip?.activities.filter(act => act.status === 'interested') ?? [];

  const formatDate = (date: Date | string) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (!trip) return null;

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
      <div className="mx-auto px-4">
        {/* Mobile Header */}
        <div className="flex sm:hidden items-center justify-between h-16">
          <Link href="/trips" className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6" />
          </Link>

          <button
            onClick={onEditClick}
            className="flex-1 mx-4 py-1 text-center rounded-full border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className="text-sm">{trip.city.name}</div>
            <div className="text-xs text-gray-500">
              {formatDate(trip.startDate)} – {formatDate(trip.endDate)} · 1 traveler
            </div>
          </button>

          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <List className="h-5 w-5" />
                  {(addedActivities.length > 0 || interestedActivities.length > 0) && (
                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {addedActivities.length + interestedActivities.length}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <ActivitySheet />
            </Sheet>
            <HereThereUserButton />
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden sm:flex items-center h-16">
          {/* Left section */}
          <div className="flex-1 flex">
            <Link href="/" className="flex items-center flex-shrink-0">
              <span className="text-2xl font-bold">HereThere</span>
            </Link>
          </div>

          {/* Center section */}
          <div className="flex items-center rounded-full border border-gray-200">
            <div className="flex items-center divide-x divide-gray-200">
              <div
                onClick={onEditClick}
                className="flex items-center hover:bg-gray-100 py-2 pl-4 cursor-pointer transition-colors rounded-l-full"
              >
                <div className="text-sm font-medium px-3 first:pl-0">{trip.city.name}</div>
                <div className="text-sm font-medium px-3 border-l border-gray-200">
                  {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                </div>
                <div className="text-sm font-medium px-3 border-l border-gray-200">1 guest</div>
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <div className="flex items-center text-sm font-medium hover:bg-gray-100 px-3 py-2 cursor-pointer transition-colors rounded-r-full">
                    <List className="h-4 w-4 mr-1" />
                    <span>Activities ({addedActivities.length + interestedActivities.length})</span>
                  </div>
                </SheetTrigger>
                <ActivitySheet />
              </Sheet>
            </div>
          </div>

          {/* Right section */}
          <div className="flex-1 flex items-center justify-end space-x-2">
            {pathname.endsWith('itinerary') ? (
              <Link
                href={`/trips/${trip.id}`}
                className="text-sm font-medium hover:bg-gray-100 px-3 py-2"
              >
                Recommendations
              </Link>
            ) : (
              <Link
                href={`/trips/${trip.id}/itinerary`}
                className="text-sm font-medium hover:bg-gray-100 px-3 py-2"
              >
                Itinerary
              </Link>
            )}
            <Link href="/trips" className="text-sm font-medium hover:bg-gray-100 px-3 py-2">
              Trips
            </Link>
            <SignedIn>
              <HereThereUserButton />
            </SignedIn>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TripHeader;
