import { Skeleton } from '@/components/ui/skeleton';

const ItineraryLoading = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Fixed Header skeleton */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
        <div className="mx-auto px-4">
          {/* Mobile Header */}
          <div className="flex sm:hidden items-center justify-between h-16">
            <Skeleton className="h-8 w-8 rounded-full" /> {/* Back button */}
            <div className="flex-1 mx-4">
              <Skeleton className="h-12 w-full rounded-full" /> {/* Trip info button */}
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-9 rounded-lg" /> {/* List button */}
              <Skeleton className="h-9 w-9 rounded-full" /> {/* User button */}
            </div>
          </div>

          {/* Desktop Header - hidden on mobile */}
          <div className="hidden sm:flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-8 rounded-full" /> {/* Back button */}
              <div className="space-y-1">
                <Skeleton className="h-5 w-48" /> {/* Title */}
                <Skeleton className="h-4 w-32" /> {/* Date range */}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-9 rounded-lg" /> {/* List button */}
              <Skeleton className="h-9 w-9 rounded-full" /> {/* User button */}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row pt-[65px] h-screen">
        {/* Itinerary view skeleton */}
        <div className="w-full lg:w-1/2 h-[calc(100vh-65px)] flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-1 gap-2">
              <Skeleton className="h-4 w-36" /> {/* Back link */}
              <Skeleton className="h-9 w-32" /> {/* Optimize button */}
            </div>
            <div className="flex md:flex-row flex-col justify-between sm:items-center mt-2">
              <div className="space-y-2">
                <Skeleton className="h-7 w-48" /> {/* Trip title */}
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-4 w-44" /> {/* Date range */}
                </div>
              </div>
              <div className="flex items-center">
                <Skeleton className="h-8 w-32" /> {/* View toggle */}
              </div>
            </div>
          </div>

          {/* Activities skeleton */}
          <div className="flex-1 overflow-hidden bg-white px-4">
            {Array(3)
              .fill(null)
              .map((_, dayIndex) => (
                <div key={dayIndex} className="border-b last:border-b-0 pt-10">
                  <div className="border-t py-3">
                    <Skeleton className="h-6 w-48" /> {/* Day header */}
                  </div>
                  {Array(3)
                    .fill(null)
                    .map((_, activityIndex) => (
                      <div key={activityIndex} className="py-4 border-t first:border-t-0">
                        <div className="flex items-start space-x-3">
                          <div className="flex items-center text-gray-500">
                            <Skeleton className="h-4 w-24" /> {/* Time */}
                          </div>
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-3/4" /> {/* Activity name */}
                            <Skeleton className="h-4 w-56" /> {/* Location */}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ))}
          </div>
        </div>

        {/* Map skeleton - desktop only */}
        <div className="hidden lg:block w-1/2 h-[calc(100vh-65px)]">
          <Skeleton className="w-full h-full" />
        </div>
      </div>
    </div>
  );
};

export default ItineraryLoading;
