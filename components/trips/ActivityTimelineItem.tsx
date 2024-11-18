import React from 'react';

import { Activity } from '@prisma/client';
import { Clock, MapPin, Navigation, ChevronRight } from 'lucide-react';

import { getGoogleMapsDirectionsUrl } from '@/lib/maps/utils';
import { cn } from '@/lib/utils';

import TimeDisplay from './TimeDisplay';
import { ActivityCategoryBadge } from '../activities/ActivityDetails';

interface ActivityTimelineItemProps {
  activity: Activity;
  nextActivity?: Activity;
  previousActivity?: Activity;
  timeZone: string;
  onHover: (activityId: string | null) => void;
  onSelect: (activityId: string | null) => void;
  isHovered: boolean;
  isSelected: boolean;
  isFirstActivity: boolean;
  isLastActivity: boolean;
}

export function ActivityTimelineItem({
  activity,
  nextActivity,
  onHover,
  onSelect,
  isHovered,
  isSelected,
  isLastActivity,
  timeZone,
}: ActivityTimelineItemProps) {
  return (
    <div className="relative group">
      {/* Left Timeline */}
      <div className="absolute left-[11px] top-0 bottom-0 w-px bg-gray-100 group-hover:bg-primary/20 transition-colors" />

      {/* Timeline Dot */}
      <div
        className={cn(
          'absolute left-[7px] top-6 w-[9px] h-[9px] rounded-full transition-all duration-200',
          isSelected || isHovered ? 'bg-primary ring-4 ring-primary/20' : 'bg-gray-200'
        )}
      />

      {/* Activity Content */}
      <div
        className={cn(
          'ml-8 py-6 px-6 transition-all duration-200',
          'border-b border-gray-50',
          isHovered && 'bg-gray-50/80',
          isSelected && 'bg-primary/5',
          'hover:cursor-pointer relative'
        )}
        onMouseEnter={() => onHover(activity.id)}
        onMouseLeave={() => onHover(null)}
        onClick={() => onSelect(activity.id)}
      >
        <div className="space-y-4">
          {/* Top Row - Category & Time */}
          <div className="flex items-center justify-between gap-4">
            <ActivityCategoryBadge category={activity.category} />
            <TimeDisplay
              timeZone={timeZone}
              startTime={activity.startTime}
              endTime={activity.endTime}
            />
          </div>

          {/* Title & Location */}
          <div className="space-y-2">
            <h4 className="text-lg font-medium leading-tight group-hover:text-primary transition-colors">
              {activity.name}
            </h4>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="line-clamp-1">{activity.address}</span>
            </div>
          </div>

          {/* Next Location Link */}
          {nextActivity && (
            <div className="pt-4 border-t border-gray-100">
              <a
                href={getGoogleMapsDirectionsUrl(
                  { latitude: activity.latitude!, longitude: activity.longitude! },
                  { latitude: nextActivity.latitude!, longitude: nextActivity.longitude! }
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between text-sm text-gray-500 hover:text-primary group/link"
              >
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4" />
                  <span>Next: {nextActivity.name}</span>
                </div>
                <ChevronRight className="h-4 w-4 opacity-0 group-hover/link:opacity-100 group-hover/link:translate-x-0.5 transition-all" />
              </a>
            </div>
          )}
        </div>

        {/* Hover Effect Overlay */}
        <div
          className={cn(
            'absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity',
            'border-l-2 border-primary'
          )}
        />
      </div>
    </div>
  );
}
