import React from 'react';
import { OverlayViewF, OVERLAY_MOUSE_TARGET } from '@react-google-maps/api';
import {
  Camera,
  MapPin,
  type LucideIcon,
  Martini,
  Landmark,
  Star,
  Palette,
  Flower2,
  Check,
  Bookmark,
  HandPlatter,
} from 'lucide-react';
import { ActivityRecommendation } from '@/lib/types/recommendations';

// Activity type icons mapping
const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  'must-see': Star,
  restaurants: HandPlatter,
  'tourist-attractions': Camera,
  culture: Palette,
  'historic-sites': Landmark,
  nightlife: Martini,
  'spas-&-wellness': Flower2,
  default: MapPin,
};

interface CustomMarkerProps {
  activity: ActivityRecommendation;
  isHighlighted: boolean;
  isInTrip: boolean;
  tripStatus?: 'planned' | 'interested';
  categoryType: string;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  labelPosition: 'left' | 'right';
}

const CustomMarker = React.memo(
  ({
    activity,
    categoryType,
    isHighlighted,
    isInTrip,
    tripStatus,
    onClick,
    onMouseEnter,
    onMouseLeave,
    labelPosition,
  }: CustomMarkerProps) => {
    const IconComponent = ACTIVITY_ICONS[categoryType] || ACTIVITY_ICONS.default;

    const getMarkerContent = () => {
      if (tripStatus === 'planned') {
        return (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500 shadow-lg border-[0.5px] border-gray-200">
            <Check className="h-5 w-5 text-white" />
          </div>
        );
      }

      if (tripStatus === 'interested') {
        return (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-lg border border-gray-200">
            <Bookmark
              className="h-5 w-5 text-yellow-300 fill-yellow-300"
              stroke="black"
              strokeWidth={1.5}
            />
          </div>
        );
      }

      // Default marker with activity-specific icon
      return (
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full 
            shadow-lg border border-gray-200 transition-colors duration-300
            ${
              isHighlighted
                ? 'border-foreground/10 bg-foreground text-background'
                : 'border-foreground/10 bg-background text-foreground hover:bg-foreground hover:text-background'
            }`}
        >
          <IconComponent className="h-5 w-5" />
        </div>
      );
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
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className={`group/marker relative block cursor-pointer rounded-full
              ${isHighlighted || isInTrip ? 'z-50' : 'hover:z-40 z-30'}`}
          >
            {getMarkerContent()}
            {isHighlighted && (
              <div
                className={`pointer-events-none absolute max-w-[160px] text-xs font-medium leading-tight text-foreground whitespace-nowrap
                  ${labelPosition === 'right' ? 'left-full ml-1' : 'right-full mr-1'} 
                  top-1/2 -translate-y-1/2 ${labelPosition === 'right' ? 'text-left' : 'text-right'}`}
              >
                <span className="rounded-sm bg-background/95 px-2 py-1 shadow-sm">
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
