import { Calendar, List, CalendarDays } from 'lucide-react';

import { Button } from '@/components/ui/button';

type ViewType = 'listMonth' | 'timeGrid';

interface ItineraryHeaderProps {
  title: string;
  startDate: Date;
  endDate: Date;
  activitiesCount?: number;
  isRebalancing?: boolean;
  onRebalance?: () => void;
  view: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function ItineraryHeader({
  title,
  startDate,
  endDate,
  activitiesCount,
  isRebalancing,
  onRebalance,
  view,
  onViewChange,
}: ItineraryHeaderProps) {
  return (
    <div className="px-4 py-3 border-b bg-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <div className="flex items-center mt-1 text-sm text-gray-500">
            <span>
              {startDate &&
                startDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              {' - '}
              {endDate &&
                endDate.toLocaleDateString('en-US', {
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
            <Button variant="outline" size="sm" onClick={onRebalance} disabled={isRebalancing}>
              {isRebalancing ? 'Optimizing...' : 'Optimize Schedule'}
            </Button>
            <div className="bg-gray-100 p-1 rounded-lg flex">
              <button
                onClick={() => onViewChange('listMonth')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  view === 'listMonth'
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="h-4 w-4" />
                <span>List</span>
              </button>
              <button
                onClick={() => onViewChange('timeGrid')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  view === 'timeGrid'
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CalendarDays className="h-4 w-4" />
                <span>Calendar</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
