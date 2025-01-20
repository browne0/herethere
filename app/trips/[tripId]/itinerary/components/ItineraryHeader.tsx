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
    <div className="px-4 py-3 border-b bg-white">
      <div className="flex items-center justify-between py-1">
        <Link
          href={`/trips/${tripId}`}
          className="mb-2 text-sm text-gray-600 hover:text-gray-900 flex items-center w-fit"
        >
          ← Back to Recommendations
        </Link>
        <Button variant="outline" size="sm" onClick={onRebalance} disabled={isRebalancing}>
          {isRebalancing ? 'Optimizing...' : 'Optimize Schedule'}
        </Button>
      </div>
      <div className="flex items-center justify-between">
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
          <div className="flex items-center gap-4">
            <div
              className={`bg-gray-100 p-1 rounded-lg flex ${disableViewToggle || isRebalancing ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <button
                onClick={() => onViewChange('itineraryList')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
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
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
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
