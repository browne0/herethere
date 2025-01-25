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
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-col lg:flex-row h-screen">
        {/* Itinerary view skeleton */}
        <div className="w-full h-[calc(100vh-65px)] flex flex-col">
          {/* Header */}
          <ItineraryHeader
            tripId={tripId}
            title={tripTitle}
            startDate={startDate}
            endDate={endDate}
            isRebalancing={true}
            view="itineraryList"
            onViewChange={() => {}}
          />

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
      </div>
    </div>
  );
};

export default ItineraryRebalancing;
