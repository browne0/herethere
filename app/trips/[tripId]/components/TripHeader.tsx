'use client';
import React from 'react';

import { SignedIn } from '@clerk/nextjs';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

import { HereThereUserButton } from '@/components/nav';
import { Button } from '@/components/ui/button';
import { useActivitiesStore } from '@/lib/stores/activitiesStore';

interface TripHeaderProps {
  onEditClick: () => void;
}

export const TripHeader = ({ onEditClick }: TripHeaderProps) => {
  const { trip } = useActivitiesStore();

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
          <HereThereUserButton />
        </div>

        {/* Desktop Header */}
        <div className="hidden sm:flex items-center justify-between h-16">
          <Link href="/" className="flex items-center flex-shrink-0">
            <span className="text-2xl font-bold">HereThere</span>
          </Link>

          <div className="flex justify-center">
            <div
              onClick={onEditClick}
              className="flex items-center px-4 py-2 rounded-full border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer max-w-xs"
            >
              <div className="text-sm font-medium">{trip.city.name}</div>
              <span className="mx-2 text-gray-300">|</span>
              <div className="text-sm font-medium">
                {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
              </div>
              <span className="mx-2 text-gray-300">|</span>
              <div className="text-sm font-medium">1 guest</div>
            </div>
          </div>

          <div className="flex gap-4 items-center">
            <Link href="/trips">
              <Button
                variant="ghost"
                className="hover:bg-indigo-50 hover:text-indigo-600 transition-colors duration-300 text-sm px-2 md:px-4"
              >
                My Trips
              </Button>
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
