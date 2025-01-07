import React from 'react';

import { Skeleton } from '@/components/ui/skeleton';

const ItineraryLoading = () => {
  // Create an array of 3 days to show loading state
  const loadingDays = Array(3).fill(null);

  return (
    <div className="mt-[65px] lg:w-1/2 h-[calc(100vh-65px)] flex flex-col">
      {/* Header skeleton */}
      <div className="px-4 py-3 border-b bg-white">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" /> {/* Trip title */}
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-44" /> {/* Date range */}
            </div>
          </div>

          {/* View toggle buttons skeleton */}
          <div className="flex items-center">
            <div className="rounded-lg px-1 py-1">
              <Skeleton className="h-8 w-32" />
            </div>
          </div>
        </div>
      </div>

      {/* List view loading state */}
      <div className="flex-1 overflow-hidden bg-white px-4">
        {loadingDays.map((_, dayIndex) => (
          <div key={dayIndex} className="border-b last:border-b-0 pt-10">
            {/* Day header */}
            <div className="border-t py-3">
              <Skeleton className="h-6 w-48" />
            </div>

            {/* Activities for the day */}
            {Array(3)
              .fill(null)
              .map((_, activityIndex) => (
                <div key={activityIndex} className="py-4 border-t first:border-t-0">
                  <div className="flex items-start space-x-3">
                    {/* Time */}
                    <div className="flex items-center text-gray-500">
                      <Skeleton className="h-4 w-24" />
                    </div>

                    {/* Activity details */}
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" /> {/* Activity name */}
                      <div className="flex items-center text-gray-500">
                        <Skeleton className="h-4 w-56" /> {/* Address */}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ItineraryLoading;
