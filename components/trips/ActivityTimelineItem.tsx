import { Activity } from '@prisma/client';
import { Navigation } from 'lucide-react';

import { getGoogleMapsDirectionsUrl } from '@/lib/maps/utils';
import { cn } from '@/lib/utils';

import { TimeDisplay } from './TimeDisplay';
import { ActivityCategoryBadge } from '../activities/ActivityDetails';
import { Card, CardContent } from '../ui/card';

interface ActivityTimelineItemProps {
  activity: Activity;
  nextActivity?: Activity;
  previousActivity?: Activity;
  isLast: boolean;
  onHover: (activityId: string | null) => void;
  onSelect: (activityId: string | null) => void;
  isHovered: boolean;
  isSelected: boolean;
  isFirstActivity: boolean;
  isLastActivity: boolean;
  timeZone: string;
}

export function ActivityTimelineItem({
  activity,
  timeZone,
  nextActivity,
  isLast,
  onHover,
  onSelect,
  isHovered,
  isSelected,
}: ActivityTimelineItemProps) {
  return (
    <div className="relative">
      {/* Activity Card */}
      <Card
        className={cn(
          'transition-colors',
          isHovered && 'border-primary',
          isSelected && 'border-primary bg-primary/5'
        )}
        onMouseEnter={() => onHover(activity.id)}
        onMouseLeave={() => onHover(null)}
        onClick={() => onSelect(activity.id)}
      >
        <CardContent className="p-4 space-y-4">
          {/* Activity Info */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="font-medium">{activity.name}</h4>
            </div>
            <ActivityCategoryBadge category={activity?.category} />
          </div>

          {/* Activity Time */}
          <TimeDisplay
            startTime={activity.startTime}
            endTime={activity.endTime}
            timeZone={timeZone}
          />

          {/* Distance and Next Location */}
          {nextActivity && (
            <div className="pt-4 border-t">
              {activity.latitude && activity.longitude && (
                <a
                  href={getGoogleMapsDirectionsUrl(
                    { latitude: activity.latitude, longitude: activity.longitude },
                    { latitude: nextActivity.latitude!, longitude: nextActivity.longitude! }
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
                >
                  <Navigation className="h-4 w-4 group-hover:text-primary" />

                  <span>Directions to {nextActivity.name}</span>
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
