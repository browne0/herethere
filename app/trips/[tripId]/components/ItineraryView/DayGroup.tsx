// app/trips/[tripId]/components/ItineraryView/DayGroup.tsx
import { useState, useMemo } from 'react';

import { format } from 'date-fns';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

import { ActivityTimelineItem } from './ActivityTimelineItem';
import type { ParsedItineraryActivity } from '../../types';

interface DayGroupProps {
  day: {
    date: Date;
    dayNumber: number;
    activities: ParsedItineraryActivity[];
  };
  isFirst: boolean;
  isLast: boolean;
  onActivityHover: (activityId: string | null) => void;
  onActivitySelect: (activityId: string | null) => void;
  hoveredActivityId: string | null;
  selectedActivityId: string | null;
}

export function DayGroup({
  day,
  isFirst,
  isLast,
  onActivityHover,
  onActivitySelect,
  hoveredActivityId,
  selectedActivityId,
}: DayGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const dayTitle = useMemo(() => {
    if (isFirst) return 'Arrival Day';
    if (isLast) return 'Departure Day';
    return `Day ${day.dayNumber}`;
  }, [isFirst, isLast, day.dayNumber]);

  return (
    <div className="bg-white rounded-xl shadow-sm">
      {/* Day Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center gap-3 hover:bg-gray-50 rounded-t-xl text-left"
      >
        <div
          className={cn(
            'p-2 rounded-lg transition-colors',
            isExpanded ? 'bg-primary/10' : 'bg-gray-100'
          )}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-primary" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
        </div>

        <div className="flex-1">
          <span className="font-medium">{dayTitle}</span>
          <span className="text-gray-500 ml-2">{format(day.date, 'MMM d')}</span>
        </div>

        <span className="text-sm text-gray-500">
          {day.activities.length} {day.activities.length === 1 ? 'activity' : 'activities'}
        </span>
      </button>

      {/* Activities List */}
      {isExpanded && (
        <div className="divide-y divide-gray-100">
          {day.activities.map((activity, index) => (
            <ActivityTimelineItem
              key={activity.id}
              activity={activity}
              nextActivity={day.activities[index + 1]}
              previousActivity={day.activities[index - 1]}
              onHover={onActivityHover}
              onSelect={onActivitySelect}
              isHovered={hoveredActivityId === activity.id}
              isSelected={selectedActivityId === activity.id}
              isFirstActivity={index === 0}
              isLastActivity={index === day.activities.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
