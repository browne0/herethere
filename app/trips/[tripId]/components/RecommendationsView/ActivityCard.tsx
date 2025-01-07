import { Loader2, Star, MapPin, CalendarPlus, Check, Bookmark } from 'lucide-react';
import { toast } from 'sonner';

import ImageSlider from '@/components/ImageSlider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GOOGLE_RESTAURANT_TYPES, MUSEUM_TYPES, RESTAURANT_TYPES } from '@/constants';
import { ActivityStatus, useActivitiesStore } from '@/lib/stores/activitiesStore';
import { ActivityRecommendation } from '@/lib/types/recommendations';
import { formatNumberIntl } from '@/lib/utils';

import { ActivityCategoryType } from '../../types';

type RestaurantTypes = typeof RESTAURANT_TYPES;
type RestaurantType = keyof RestaurantTypes;
type MuseumTypes = typeof MUSEUM_TYPES;
type MuseumType = keyof MuseumTypes;

interface ActivityCardProps {
  activity: ActivityRecommendation;
  category: ActivityCategoryType;
  isHighlighted?: boolean;
  onHover: (activityId: string | null) => void;
}

interface ActivityImages {
  urls: Array<{ url: string; cdnUrl: string }>;
}

function getDurationDisplay(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes}m`
    : `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

export const getPrimaryTypeDisplay = (activity: ActivityRecommendation): string | null => {
  if (!activity) return null;

  const restaurantTypes = new Set(GOOGLE_RESTAURANT_TYPES);

  // 1. First check primaryType if it exists
  if (activity.primaryType) {
    // Special case for ramen restaurant
    if (activity.primaryType === 'ramen_restaurant') {
      return RESTAURANT_TYPES['japanese_restaurant'];
    } else if (activity.primaryType === 'pizza_restaurant') {
      return 'Pizza Restaurant';
    }

    // If primaryType ends with 'restaurant', look for cuisine-specific types in placeTypes
    if (activity.primaryType.endsWith('restaurant') && activity.placeTypes?.length > 0) {
      // Special case for ramen in place types
      if (activity.placeTypes.includes('ramen_restaurant')) {
        return RESTAURANT_TYPES['japanese_restaurant'];
      } else if (activity.primaryType === 'pizza_restaurant') {
        return 'Pizza Restaurant';
      }

      // Look for a cuisine-specific restaurant type in placeTypes
      const cuisineType = activity.placeTypes.find(
        type => restaurantTypes.has(type) && RESTAURANT_TYPES[type as RestaurantType]
      );
      if (cuisineType) {
        return RESTAURANT_TYPES[cuisineType as RestaurantType];
      }
    }

    // If primaryType is in our restaurant types, use it
    if (restaurantTypes.has(activity.primaryType)) {
      return RESTAURANT_TYPES[activity.primaryType as RestaurantType];
    }

    // Check if it's a museum type
    if (activity.primaryType in MUSEUM_TYPES) {
      return MUSEUM_TYPES[activity.primaryType as MuseumType];
    }

    // If primary type exists but isn't in our mappings, format it nicely
    return activity.primaryType
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // 2. If no primaryType, check placeTypes array
  if (activity.placeTypes?.length > 0) {
    // Look for restaurant types first
    const restaurantType = activity.placeTypes.find(type => restaurantTypes.has(type));
    if (restaurantType) {
      return RESTAURANT_TYPES[restaurantType as RestaurantType];
    }

    // Look for museum types next
    const museumType = activity.placeTypes.find(type => type in MUSEUM_TYPES);
    if (museumType) {
      return MUSEUM_TYPES[museumType as MuseumType];
    }

    // If no specific type found, format the first place type nicely
    return activity.placeTypes[0]
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  return null;
};

export function ActivityCard({ activity, category, onHover }: ActivityCardProps) {
  const {
    findActivityByRecommendationId,
    trip,
    removeActivity,
    updateActivity,
    addActivity,
    loadingActivities,
  } = useActivitiesStore();

  const existingActivity = findActivityByRecommendationId(activity.id);
  const currentStatus = existingActivity?.status || 'none';

  const isActivityLoading = loadingActivities.has(activity.id);

  const handleAction = async (newStatus: ActivityStatus) => {
    if (!trip || isActivityLoading) return;

    try {
      // If clicking the same status, remove the activity
      if (existingActivity && currentStatus === newStatus) {
        await removeActivity(trip.id, existingActivity.id);
        toast.success('Activity removed from trip');
      } else {
        // If activity exists, update its status
        if (existingActivity) {
          await updateActivity(trip.id, existingActivity.id, { status: newStatus });
          toast.success('Activity status updated', {
            description:
              newStatus === 'planned'
                ? "We'll schedule this at the best time."
                : "We'll keep this in mind when planning.",
          });
        } else {
          // Add new activity
          await addActivity(trip.id, {
            recommendationId: activity.id,
            status: newStatus,
          });
          toast.success('Activity added!', {
            description:
              newStatus === 'planned'
                ? "We'll optimize your schedule to fit this in."
                : "We'll keep this in your interests list.",
          });
        }
      }
    } catch (_error) {
      // The store is handling the error state, but we'll show a user-friendly toast
      toast.error('Error', {
        description: 'Failed to manage activity. Please try again.',
      });
    }
  };

  // Parse the images JSON to get the photo reference
  const images = activity.images as unknown as ActivityImages;

  return (
    <div
      className={`bg-white shadow-md hover:shadow-lg transition-all duration-200 rounded-xl overflow-hidden`}
      onMouseEnter={() => onHover(activity.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Fixed height container for consistent card sizing */}
      <div className="h-[370px] flex flex-col">
        {/* Image container */}
        <div className="relative w-full h-full md:h-[200px]">
          <ImageSlider
            images={images?.urls}
            alt={activity.name}
            className="rounded-t-xl"
            activityId={activity.id}
          />
          {activity.isMustSee && category.type !== 'must-see' && (
            <div className="absolute top-3 left-3">
              <Badge className="bg-amber-400 hover:bg-amber-400 text-black font-medium px-2 py-1">
                Must See
              </Badge>
            </div>
          )}
        </div>

        {/* Content container */}
        <div className="flex flex-col flex-grow p-3">
          <div className="flex items-center gap-1 text-sm mb-2">
            <Star className="w-3.5 h-3.5 text-black-500 fill-black" />
            <span className="font-medium">{activity.rating?.toFixed(1)}</span>
            <span className="text-gray-600">({formatNumberIntl(activity.reviewCount)})</span>
            <span className="text-gray-600 mx-1">·</span>
            <span className="text-gray-600">{getDurationDisplay(activity.duration)}</span>
          </div>

          <h3 className="font-medium text-sm leading-tight line-clamp-2">{activity.name}</h3>
          <p className="text-sm gap-1 text-gray-500 mb-2">{getPrimaryTypeDisplay(activity)}</p>
          <p className="flex items-center gap-1.5 text-sm text-gray-500">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">
              {(activity.location as { neighborhood: string })?.neighborhood ||
                'Location unavailable'}
            </span>
            <p>{activity.priceLevel}</p>
          </p>

          {/* Push button to bottom */}
          <div className="flex-grow" />

          <div className="flex gap-2 mt-2.5">
            <Button
              onClick={() => handleAction('planned')}
              disabled={isActivityLoading}
              variant={currentStatus === 'planned' ? 'default' : 'outline'}
              className={`w-1/2 text-xs ${
                currentStatus === 'planned'
                  ? 'bg-primary hover:bg-primary/90'
                  : 'border-primary/20 hover:bg-primary/10'
              }`}
            >
              {isActivityLoading ? (
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
              ) : (
                <>
                  {currentStatus === 'planned' ? (
                    <div className="inline-flex items-center justify-center bg-green-500 rounded-full p-[1.5px]">
                      <Check className="text-background p-[0.5px]" />
                    </div>
                  ) : (
                    <CalendarPlus className="w-2.5 h-2.5" />
                  )}
                </>
              )}
              {currentStatus === 'planned' ? 'Added to trip' : 'Add to trip'}
            </Button>

            <Button
              onClick={() => handleAction('interested')}
              disabled={isActivityLoading}
              variant="outline"
              className={`w-1/2 text-xs ${
                currentStatus === 'interested'
                  ? 'bg-gray-100 text-gray-900 hover:bg-gray-200 border-primary/20 hover:bg-primary/10'
                  : 'border-primary/20 hover:bg-primary/10'
              }`}
            >
              {isActivityLoading ? (
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
              ) : (
                <Bookmark
                  className={`w-2.5 h-2.5 ${currentStatus === 'interested' ? 'text-yellow-300 fill-yellow-300' : ''}`}
                  strokeWidth={1.5}
                  stroke="black"
                />
              )}
              Interested
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ActivityCard;
