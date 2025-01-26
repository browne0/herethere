'use client';

import { SignedIn } from '@clerk/nextjs';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

import { HereThereUserButton } from '@/components/nav';
import { Button } from '@/components/ui/button';
import { useActivitiesStore } from '@/lib/stores/activitiesStore';

interface TripHeaderProps {
  onEditClick: () => void;
  onDateClick: () => void;
  onCityClick: () => void;
  onTitleClick: () => void;
}

export const TripHeader = ({
  onEditClick,
  onDateClick,
  onCityClick,
  onTitleClick,
}: TripHeaderProps) => {
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
        <div className="flex md:hidden items-center justify-between h-16">
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
            <HereThereUserButton />
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:flex items-center h-16">
          {/* Left section */}
          <div className="flex-1 flex">
            <Link href="/" className="flex items-center flex-shrink-0">
              <span className="text-2xl font-bold">HereThere</span>
            </Link>
          </div>

          {/* Center section */}
          <div className="flex items-center rounded-full border border-gray-200">
            <div className="flex items-center">
              <Button
                onClick={onCityClick}
                variant="ghost"
                className="text-sm font-medium px-3 py-2 hover:bg-gray-100 transition-colors rounded-l-full"
                disabled
              >
                {trip.city.name}
              </Button>
              <Button
                onClick={onTitleClick}
                variant="ghost"
                className="text-sm font-medium px-3 py-2 hover:bg-gray-100 transition-colors border-l border-gray-200 rounded-none"
              >
                {trip.title}
              </Button>
              <Button
                onClick={onDateClick}
                variant="ghost"
                className="text-sm font-medium px-3 py-2 border-l border-gray-200 hover:bg-gray-100 transition-colors rounded-r-full"
              >
                {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
              </Button>
            </div>
          </div>

          {/* Right section */}
          <div className="flex-1 flex items-center justify-end space-x-2">
            <Link href="/trips" className="text-sm font-medium hover:bg-gray-100 px-3 py-2">
              My Trips
            </Link>
            <div className="pl-3">
              <SignedIn>
                <HereThereUserButton />
              </SignedIn>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TripHeader;
