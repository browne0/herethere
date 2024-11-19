'use client';

import { useState } from 'react';

import { format } from 'date-fns';
import { X, ChevronUp, ChevronDown, Clock } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { ParsedItineraryActivity } from '../types';

interface SelectedActivitiesBannerProps {
  tripId: string;
  activities: ParsedItineraryActivity[];
}

export function SelectedActivitiesBanner({ tripId, activities }: SelectedActivitiesBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  if (!activities.length || !isVisible) return null;

  const totalActivities = activities.length;
  const totalDuration = activities.reduce((acc, activity) => {
    const start = new Date(activity.startTime);
    const end = new Date(activity.endTime);
    return acc + (end.getTime() - start.getTime()) / (1000 * 60); // Convert to minutes
  }, 0);

  const hoursPlanned = Math.round(totalDuration / 60);

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t transform transition-transform duration-300',
        isExpanded ? 'h-96' : 'h-20'
      )}
    >
      {/* Collapsed View */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-lg font-semibold">{totalActivities} Activities Selected</div>
              <div className="text-sm text-gray-600 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {hoursPlanned} hours planned
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsVisible(false)}
              className="p-2 hover:bg-gray-100 rounded-full"
              aria-label="Close banner"
            >
              <X className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <span>{isExpanded ? 'Hide' : 'View'} Itinerary</span>
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="max-w-7xl mx-auto px-4 py-6 overflow-y-auto h-[calc(100%-5rem)]">
          <div className="space-y-4">
            {activities.map(activity => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <h3 className="font-medium">{activity.recommendation.name}</h3>
                  <div className="text-sm text-gray-600">
                    {format(new Date(activity.startTime), 'h:mm a')} -{' '}
                    {format(new Date(activity.endTime), 'h:mm a')}
                  </div>
                </div>

                <button
                  onClick={async () => {
                    // Implement remove activity
                    try {
                      await fetch(`/api/trips/${tripId}/activities/${activity.id}`, {
                        method: 'DELETE',
                      });
                      // You'll need to implement a way to refresh the activities list
                    } catch (error) {
                      console.error('Failed to remove activity:', error);
                    }
                  }}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center text-sm text-gray-600">
            Activities are automatically scheduled for optimal timing
          </div>
        </div>
      )}
    </div>
  );
}
