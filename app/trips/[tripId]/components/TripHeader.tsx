'use client';
import React from 'react';

import { User } from '@prisma/client';
import { format } from 'date-fns';
import { Calendar, Trash2 } from 'lucide-react';

import { useActivitiesStore } from '@/lib/stores/activitiesStore';

import { useTripView } from '../hooks/useTripView';
import { ParsedTrip } from '../types';
import TripPreferencesBar from './TripPreferencesBar';

export default function TripHeader({
  trip,
  onDeleteClick,
  onUpdateTrip,
  user,
}: {
  trip: ParsedTrip;
  onDeleteClick: () => void;
  onUpdateTrip: (tripId: string, data: Partial<ParsedTrip>) => Promise<void>;
  user: User;
}) {
  const { view, setView } = useTripView();
  const { activities } = useActivitiesStore();

  const handlePreferenceUpdate = async (key: string, value: any) => {
    try {
      const updatedPreferences = {
        ...trip.preferences,
        [key]: value,
      };

      await onUpdateTrip(trip.id, {
        preferences: updatedPreferences,
      });
    } catch (error) {
      console.log(error);
    }
  };
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
          <div className="max-w-7xl mx-auto px-4">
            <div className="h-16 flex items-center justify-between">
              {/* Trip Info */}
              <div>
                <h1 className="text-lg font-semibold">Trip to {trip.city.name}</h1>
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
                <Trash2 className="w-5 h-5 pr-1" />
                Delete Trip
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs - Shared between Mobile & Desktop */}
        <div className="flex border-t border-gray-100">
          <div className="flex w-full md:w-auto md:mx-auto">
            {[
              { label: 'Recommendations', value: 'recommendations' },
              { label: 'Itinerary', value: 'itinerary' },
            ].map(tab => (
              <button
                key={tab.value}
                className={`
                  flex-1 md:flex-initial px-6 py-3 text-sm font-medium relative
                  ${
                    view === tab.value
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }
                `}
                onClick={() => setView(tab.value)}
              >
                <span>{tab.label}</span>
                {tab.value === 'itinerary' && activities.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full inline-flex items-center justify-center">
                    {activities.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <TripPreferencesBar trip={trip} user={user} onUpdatePreferences={handlePreferenceUpdate} />
      </div>
    </div>
  );
}
