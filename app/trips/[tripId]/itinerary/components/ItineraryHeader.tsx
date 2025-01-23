import { Button } from '@/components/ui/button';
import { CalendarDays, List } from 'lucide-react';
import Link from 'next/link';

type ViewType = 'itineraryList' | 'timeGrid';

interface ItineraryHeaderProps {
  tripId: string;
  title: string;
  startDate: Date | string | number;
  endDate: Date | string | number;
  activitiesCount?: number;
  isRebalancing?: boolean;
  onRebalance?: () => void;
  view: ViewType;
  onViewChange: (view: ViewType) => void;
  disableViewToggle?: boolean;
}

export function ItineraryHeader({
  tripId,
  title,
  startDate,
  endDate,
  activitiesCount,
  isRebalancing,
  onRebalance,
  view,
  onViewChange,
  disableViewToggle,
}: ItineraryHeaderProps) {
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);

  return (
    <div className="px-4 py-3 bg-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between py-1 gap-2">
        <Link
          href={`/trips/${tripId}`}
          className="mb-2 text-sm text-gray-600 hover:text-gray-900 flex items-center w-fit"
        >
          ← Back to Recommendations
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={onRebalance}
          disabled={isRebalancing}
          className="w-full sm:w-auto"
        >
          {isRebalancing ? 'Optimizing...' : 'Optimize Schedule'}
        </Button>
      </div>
      <div className="flex md:flex-row flex-col justify-between sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <div className="flex items-center mt-1 text-sm text-gray-500">
            <span>
              {start.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
              {' - '}
              {end.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
            {activitiesCount !== undefined && (
              <>
                <span className="mx-2">•</span>
                <span>{`${activitiesCount} activities`}</span>
              </>
            )}
          </div>
        </div>

        {onViewChange && (
          <div className="flex items-center w-full sm:w-auto mt-2 sm:mt-0">
            <div
              className={`bg-gray-100 p-1 rounded-lg flex w-full sm:w-auto ${
                disableViewToggle || isRebalancing ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <button
                onClick={() => onViewChange('itineraryList')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors flex-1 sm:flex-initial justify-center sm:justify-start ${
                  view === 'itineraryList'
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                disabled={disableViewToggle || isRebalancing}
              >
                <List className="h-4 w-4" />
                <span>Trip Overview</span>
              </button>
              <button
                onClick={() => onViewChange('timeGrid')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors flex-1 sm:flex-initial justify-center sm:justify-start ${
                  view === 'timeGrid'
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                disabled={disableViewToggle || isRebalancing}
              >
                <CalendarDays className="h-4 w-4" />
                <span>Adjust Schedule</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
