// app/trips/[tripId]/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function TripLoading() {
  return (
    <div className="bg-white min-h-screen">
      {/* Header skeleton - same on mobile and desktop */}
      <div className="border-b border-gray-200">
        <div className="h-[65px] px-4 flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="lg:hidden">
        {/* Map skeleton */}
        <div className="h-[calc(100vh-289px)]">
          <Skeleton className="w-full h-full" />
        </div>

        {/* Drawer content skeleton */}
        <div className="rounded-t-[10px] bg-white border-t border-x border-gray-200 relative -mt-6">
          {/* Drawer handle */}
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 my-4" />

          {/* Category chips skeleton */}
          <div className="px-4 pb-4">
            <div className="flex gap-2 overflow-x-auto">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-28 flex-shrink-0 rounded-full" />
              ))}
            </div>
          </div>

          {/* Activity cards skeleton */}
          <div className="px-4 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop layout - hidden on mobile */}
      <div className="hidden lg:block">
        {/* Desktop category nav skeleton */}
        <div className="border-b border-gray-200">
          <div className="flex gap-2 p-4 overflow-x-auto">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-9 w-32 flex-shrink-0" />
            ))}
          </div>
        </div>

        {/* Desktop content skeleton */}
        <div className="flex">
          <div className="w-7/12 p-4">
            <div className="grid grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-48 w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          </div>

          {/* Desktop map skeleton */}
          <div className="w-5/12 fixed top-[144px] right-0 bottom-0">
            <Skeleton className="w-full h-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
