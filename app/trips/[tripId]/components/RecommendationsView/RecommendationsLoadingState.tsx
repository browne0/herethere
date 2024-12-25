import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const RecommendationsLoadingState = () => {
  return (
    <div className="space-y-8">
      {/* Info box skeleton */}
      <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" /> {/* Icon skeleton */}
          <Skeleton className="h-5 w-48" /> {/* Title skeleton */}
        </div>
        <Skeleton className="h-4 w-full mt-2" /> {/* Description skeleton */}
      </div>

      {/* Category header skeletons */}
      <div className="bg-gray-100 border border-gray-200 rounded-lg w-96 space-y-2">
        <Skeleton className="h-8 w-64" /> {/* Category title skeleton */}
        <Skeleton className="h-5 w-96" /> {/* Category description skeleton */}
      </div>

      {/* Activity card grid skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
            <Skeleton className="w-full h-48 rounded-lg" /> {/* Image skeleton */}
            <Skeleton className="h-6 w-3/4" /> {/* Title skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" /> {/* Description line 1 */}
              <Skeleton className="h-4 w-5/6" /> {/* Description line 2 */}
            </div>
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-24" /> {/* Price/duration skeleton */}
              <Skeleton className="h-9 w-24" /> {/* Button skeleton */}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="mt-8 flex justify-center gap-2 mb-16">
        <Skeleton className="h-9 w-20" /> {/* Previous button */}
        <Skeleton className="h-9 w-32" /> {/* Page indicator */}
        <Skeleton className="h-9 w-20" /> {/* Next button */}
      </div>
    </div>
  );
};

export default RecommendationsLoadingState;
