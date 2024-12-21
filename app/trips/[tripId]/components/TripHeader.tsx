'use client';
import React from 'react';

import { User } from '@prisma/client';
import { format } from 'date-fns';
import { Calendar, Trash2 } from 'lucide-react';

import { ParsedTrip } from '../types';

export default function TripHeader({
  trip,
  onDeleteClick,
  user,
}: {
  trip: ParsedTrip;
  onDeleteClick: () => void;
  user: User;
}) {
  return (
    <div className="sticky top-[73px] top-0 bg-white z-50">
      {/* Main Header */}
      <div className="border-b border-gray-100">
        {/* Mobile Header */}
        <div className="flex flex-col md:hidden">
          {/* Trip Info */}
          <div className="px-4 py-3">
            <h1 className="text-lg font-medium">{trip.title}</h1>
            <div className="flex items-center mt-1 text-sm text-gray-600">
              <Calendar className="w-4 h-4 mr-1.5" />
              <span>
                {format(trip.startDate, 'MMM d')} - {format(trip.endDate, 'MMM d, yyyy')}
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block">
          <div className="p-4 md:px-[80px]">
            <div className="flex items-center justify-between">
              {/* Trip Info */}
              <div>
                <h1 className="text-2xl font-semibold mb-1">Trip to {trip.city.name}</h1>
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-1" />
                  {format(trip.startDate, 'MMM d')} - {format(trip.endDate, 'MMM d, yyyy')}
                </div>
              </div>

              {/* Delete Button */}
              <button
                onClick={onDeleteClick}
                className="flex text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-md transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                Delete Trip
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
