import { Skeleton } from '@/components/ui/skeleton';

import { ItineraryHeader } from './ItineraryHeader';

interface ItineraryRebalancingProps {
  tripId: string;
  tripTitle: string;
  startDate: Date;
  endDate: Date;
}

const ItineraryRebalancing = ({
  tripId,
  tripTitle,
  startDate,
  endDate,
}: ItineraryRebalancingProps) => {
  // Create an array of 3 days to show loading state
  const loadingDays = Array(3).fill(null);

  return (
    <div className="mt-[65px] lg:w-1/2 h-[calc(100vh-65px)] flex flex-col">
      <ItineraryHeader
        tripId={tripId}
        title={tripTitle}
        startDate={startDate}
        endDate={endDate}
        isRebalancing={true}
        view="itineraryList"
        onViewChange={() => {}}
      />

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
                      <Skeleton className="h-5 w-3/4" />
                      <div className="flex items-center text-gray-500">
                        <Skeleton className="h-4 w-56" />
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

export default ItineraryRebalancing;
