// app/trips/[tripId]/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function TripLoading() {
  return (
    <div className="relative bg-gray-50">
      {/* Desktop Layout */}
      <div className="hidden lg:flex lg:flex-col h-full">
        <div className="bg-white shadow fixed top-[65px] z-50 w-full">
          {/* Header with stats and buttons */}
          <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
            <div className="flex divide-x">
              <div className="flex items-center gap-2 pr-4">
                <Skeleton className="h-5 w-5" /> {/* ListChecks icon */}
                <span className="text-sm">
                  <Skeleton className="h-4 w-24" /> {/* "X activities added" */}
                </span>
              </div>
              <div className="flex items-center gap-2 pl-4">
                <Skeleton className="h-5 w-5" /> {/* Bookmark icon */}
                <span className="text-sm">
                  <Skeleton className="h-4 w-32" /> {/* "X saved for later" */}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-28" /> {/* View Activities button */}
              <Skeleton className="h-9 w-28" /> {/* View Itinerary button */}
            </div>
          </div>

          {/* Category navigation */}
          <div className="flex items-center justify-between w-full border-b border-gray-200">
            <div className="flex-1 relative min-w-0">
              <div className="flex gap-2 p-4 overflow-x-auto">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-9 w-32 flex-shrink-0" />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 flex-shrink-0 border-l border-gray-200 bg-white">
              <Skeleton className="h-9 w-24" /> {/* Filters button */}
              <Skeleton className="h-9 w-28" /> {/* Delete Trip button */}
            </div>
          </div>
        </div>

        <div className="flex overflow-hidden">
          {/* Activity cards section */}
          <div className="w-6/12 mt-[144px]">
            <div className="py-4 ml-4">
              <Skeleton className="h-8 w-64 mb-2" /> {/* Category title */}
              <Skeleton className="h-5 w-96" /> {/* Category description */}
            </div>
            <div className="px-4 grid gap-4 grid-cols-1 md:grid-cols-2 pb-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white shadow-md rounded-xl overflow-hidden">
                  <Skeleton className="w-full h-[200px]" /> {/* Image */}
                  <div className="p-3 space-y-3">
                    <Skeleton className="h-6 w-3/4" /> {/* Title */}
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-16" /> {/* Rating */}
                      <Skeleton className="h-4 w-24" /> {/* Location */}
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-1/2" /> {/* Add to trip button */}
                      <Skeleton className="h-9 w-1/2" /> {/* Interested button */}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Map section */}
          <div className="w-6/12 fixed top-[144px] right-0 bottom-0">
            <Skeleton className="w-full h-full" />
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        <div className="fixed top-[64px] left-0 right-0 bg-white z-10">
          <div className="px-4 py-2 border-b">
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-10 w-full" /> {/* Discover tab */}
              <Skeleton className="h-10 w-full" /> {/* My Activities tab */}
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="flex gap-2 overflow-x-auto">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-28 flex-shrink-0 rounded-full" />
              ))}
            </div>
          </div>
        </div>

        <div className="pt-[140px]">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4">
              <div className="bg-white shadow-md rounded-xl overflow-hidden">
                <Skeleton className="w-full h-[200px]" /> {/* Image */}
                <div className="p-3 space-y-3">
                  <Skeleton className="h-6 w-3/4" /> {/* Title */}
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-16" /> {/* Rating */}
                    <Skeleton className="h-4 w-24" /> {/* Location */}
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-1/2" /> {/* Add to trip button */}
                    <Skeleton className="h-9 w-1/2" /> {/* Interested button */}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
