import React from 'react';

import { OVERLAY_MOUSE_TARGET, OverlayViewF } from '@react-google-maps/api';
import { Bookmark, Check } from 'lucide-react';

import { ActivityRecommendation } from '@/lib/types/recommendations';
import { cn } from '@/lib/utils';

interface CustomMarkerProps {
  activity: ActivityRecommendation;
  isHighlighted: boolean;
  isInTrip: boolean;
  tripStatus?: 'planned' | 'interested';
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  labelPosition: 'left' | 'right';
  hoveredActivityId: string | null;
}

const CustomMarker = React.memo(
  ({
    activity,
    isHighlighted,
    isInTrip,
    tripStatus,
    onClick,
    labelPosition,
    hoveredActivityId,
  }: CustomMarkerProps) => {
    const getMarkerContent = () => {
      if (tripStatus === 'planned') {
        return (
          <div
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full bg-green-500 shadow-lg border-[0.5px] border-gray-200 transition-opacity duration-200',
              {
                'opacity-100': !hoveredActivityId || isHighlighted,
                'opacity-40': hoveredActivityId && !isHighlighted,
                'animate-bounce duration-500': isHighlighted,
              }
            )}
          >
            <Check className="h-5 w-5 text-white" />
          </div>
        );
      }

      if (tripStatus === 'interested') {
        return (
          <div
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-lg border border-gray-200 transition-opacity duration-200',
              {
                'opacity-100': !hoveredActivityId || isHighlighted,
                'opacity-40': hoveredActivityId && !isHighlighted,
                'animate-bounce': isHighlighted,
              }
            )}
          >
            <Bookmark
              className="h-5 w-5 text-yellow-300 fill-yellow-300"
              stroke="black"
              strokeWidth={1.5}
            />
          </div>
        );
      }
    };

    return (
      <OverlayViewF
        position={{
          lat: activity.location.latitude,
          lng: activity.location.longitude,
        }}
        mapPaneName={OVERLAY_MOUSE_TARGET}
        getPixelPositionOffset={(width, height) => ({
          x: -(width / 2),
          y: -(height / 2),
        })}
      >
        <div className="relative">
          <button
            onClick={onClick}
            className={`group/marker relative block cursor-pointer rounded-full
              ${isHighlighted ? 'z-50' : 'hover:z-40 z-30'}`}
          >
            {getMarkerContent()}
            {isHighlighted && (
              <div
                className={`pointer-events-none absolute max-w-[160px] text-xs font-medium leading-tight text-foreground whitespace-nowrap
                ${labelPosition === 'right' ? 'left-full ml-2' : 'right-full mr-2'} 
                top-1/2 -translate-y-1/2 ${labelPosition === 'right' ? 'text-left' : 'text-right'}`}
              >
                <span
                  className={cn('rounded-sm bg-background/95 px-2 py-1 shadow-sm', {
                    'border-2 border-black': isHighlighted,
                  })}
                >
                  {activity.name}
                </span>
              </div>
            )}
          </button>
        </div>
      </OverlayViewF>
    );
  }
);

CustomMarker.displayName = 'CustomMarker';

export default CustomMarker;
