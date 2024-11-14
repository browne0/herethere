import { Activity } from '@prisma/client';
import { ArrowRight, Navigation } from 'lucide-react';

import { getGoogleMapsDirectionsUrl } from '@/lib/maps/utils';
import { Accommodation } from '@/lib/trips';
import { cn } from '@/lib/utils';

import { TimeDisplay } from './TimeDisplay';
import { ActivityCategoryBadge } from '../activities/ActivityDetails';
import { Card, CardContent } from '../ui/card';

interface RouteInfo {
  distance: string;
  duration: string;
}

interface ActivityTimelineItemProps {
  activity: Activity;
  nextActivity?: Activity;
  previousActivity?: Activity;
  accommodation?: Accommodation;
  isLast: boolean;
  onHover: (activityId: string | null) => void;
  onSelect: (activityId: string | null) => void;
  isHovered: boolean;
  isSelected: boolean;
  isCalculatingRoutes: boolean;
  isFirstActivity: boolean;
  isLastActivity: boolean;
  routeToNext?: RouteInfo;
  timeZone: string;
}

export function ActivityTimelineItem({
  activity,
  timeZone,
  nextActivity,
  accommodation,
  isLast,
  onHover,
  onSelect,
  isHovered,
  isSelected,
  isCalculatingRoutes,
  routeToNext,
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
          {(nextActivity || (!isLast && accommodation)) && (
            <div className="pt-4 border-t">
              {routeToNext && activity.latitude && activity.longitude && !isCalculatingRoutes && (
                <a
                  href={getGoogleMapsDirectionsUrl(
                    { latitude: activity.latitude, longitude: activity.longitude },
                    nextActivity
                      ? { latitude: nextActivity.latitude!, longitude: nextActivity.longitude! }
                      : { latitude: accommodation!.latitude, longitude: accommodation!.longitude }
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
                >
                  <Navigation className="h-4 w-4 group-hover:text-primary" />
                  <span className="font-medium group-hover:text-primary">
                    {routeToNext.distance}
                  </span>
                  <ArrowRight className="h-4 w-4 group-hover:text-primary" />
                  <span>
                    {routeToNext.duration} to{' '}
                    {nextActivity ? nextActivity.name : accommodation?.name}
                  </span>
                </a>
              )}
              {isCalculatingRoutes && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                  <Navigation className="h-4 w-4" />
                  <span>Calculating route...</span>
                </div>
              )}
              {!routeToNext && !isCalculatingRoutes && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Navigation className="h-4 w-4" />
                  <span>Unable to calculate route</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
