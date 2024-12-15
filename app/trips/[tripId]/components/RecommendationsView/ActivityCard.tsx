import { useState } from 'react';

import { ActivityRecommendation } from '@prisma/client';
import { Heart, Loader2, Star, MapPin, CalendarPlus, Check } from 'lucide-react';
import { toast } from 'sonner';

import { CachedImage, ImageUrl } from '@/components/CachedImage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MUSEUM_TYPES, RESTAURANT_TYPES } from '@/constants';
import { ActivityStatus, useActivitiesStore } from '@/lib/stores/activitiesStore';
import { formatNumberIntl } from '@/lib/utils';

import { ActivityShelfType } from '../../types';

type RestaurantTypes = typeof RESTAURANT_TYPES;
type RestaurantType = keyof RestaurantTypes;
type MuseumTypes = typeof MUSEUM_TYPES;
type MuseumType = keyof MuseumTypes;

interface ActivityCardProps {
  activity: ActivityRecommendation;
  onAdd: (activity: ActivityRecommendation, status: ActivityStatus) => Promise<void>;
  shelf: ActivityShelfType;
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

function getDimensionsFromUrl(url: string): { width: number; height: number } | null {
  const match = url.match(/-(\d+)x(\d+)\.[a-zA-Z]+$/);
  if (match) {
    return {
      width: parseInt(match[1]),
      height: parseInt(match[2]),
    };
  }
  return null;
}

function getBestImageUrl(images: ActivityImages | null): ImageUrl | null {
  if (!images?.urls?.length) return null;

  const scoredUrls = images.urls.map(imageUrl => {
    let score = 0;

    // Prefer CDN URLs as they're likely optimized
    if (imageUrl.cdnUrl) score += 5;

    // Score based on dimensions if available
    const dimensions = getDimensionsFromUrl(imageUrl.cdnUrl || imageUrl.url);
    if (dimensions) {
      const { width, height } = dimensions;
      const aspectRatio = width / height;

      // Prefer landscape orientation for activity cards
      if (aspectRatio > 1) score += 5;

      // Prefer reasonable aspect ratios (not too wide or tall)
      if (aspectRatio > 0.5 && aspectRatio < 2) score += 5;

      // Prefer high resolution but not excessive
      if (width >= 1200 && width <= 2000) score += 10;
      else if (width > 2000) score += 5;
      else if (width < 800) score -= 5;

      // Penalize extremely large images
      if (width > 3000 || height > 3000) score -= 5;
    }

    return { imageUrl, score };
  });

  return scoredUrls.sort((a, b) => b.score - a.score)[0]?.imageUrl || null;
}

const getPrimaryTypeDisplay = (activity: ActivityRecommendation): string | null => {
  // First check primaryType
  if (activity.primaryType) {
    // Handle restaurants
    if (activity.primaryType.includes('restaurant') || activity.primaryType === 'steak_house') {
      return RESTAURANT_TYPES[activity.primaryType as RestaurantType];
    }

    // Handle museums
    if (activity.primaryType in MUSEUM_TYPES) {
      return MUSEUM_TYPES[activity.primaryType as MuseumType];
    }
  }

  // If no primaryType or not found in constants, check placeTypes array
  else if (activity.primaryType === '' && activity.placeTypes?.length > 0) {
    // Check for restaurant types
    const restaurantType = activity.placeTypes.find(
      type => type.includes('restaurant') || type === 'steak_house'
    );
    if (restaurantType) {
      return RESTAURANT_TYPES[restaurantType as RestaurantType];
    }

    // Check for museum types
    const museumType = activity.placeTypes.find(type => type in MUSEUM_TYPES);
    if (museumType) {
      return MUSEUM_TYPES[museumType as MuseumType];
    }
  }

  // If no matching types found, fall back to primaryType formatting
  if (activity.primaryType) {
    return activity.primaryType
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  return null;
};

export function ActivityCard({ activity, onAdd, shelf }: ActivityCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { findActivityByRecommendationId, tripId, removeActivity } = useActivitiesStore();

  const existingActivity = findActivityByRecommendationId(activity.id);
  const currentStatus = existingActivity?.status || 'none';

  const handleAction = async (newStatus: ActivityStatus) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // If clicking the same status, remove the activity
      if (existingActivity && currentStatus === newStatus) {
        const response = await fetch(`/api/trips/${tripId}/activities/${existingActivity.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) throw new Error('Failed to remove activity');

        removeActivity(existingActivity.id);
        toast.success('Activity removed from trip');
      } else {
        // Existing add/update logic
        await onAdd(activity, newStatus);
      }
    } catch (error) {
      console.error('Error managing activity:', error);
      toast.error('Error', {
        description: 'Failed to manage activity. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Parse the images JSON to get the photo reference
  const images = activity.images as unknown as ActivityImages;
  const photoUrl = getBestImageUrl(images);

  return (
    <div className="w-72 bg-white shadow-md hover:shadow-lg transition-shadow rounded-xl overflow-hidden flex-shrink-0">
      {/* Fixed height container for consistent card sizing */}
      <div className="h-96 flex flex-col">
        {/* Image container with fixed aspect ratio */}
        <div className="relative w-full h-40">
          {photoUrl ? (
            <CachedImage
              photo={photoUrl}
              alt={activity.name}
              className="absolute inset-0 w-full h-full object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
          )}
          {activity.isMustSee && shelf.type !== 'must-see' && (
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
            <Star className="w-4 h-4 text-yellow-500" />
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
          </p>

          {/* Push button to bottom */}
          <div className="flex-grow" />

          <div className="space-y-2">
            <Button
              onClick={() => handleAction('planned')}
              disabled={isLoading}
              variant={currentStatus === 'planned' ? 'default' : 'outline'}
              className={`w-full ${
                currentStatus === 'planned'
                  ? 'bg-primary hover:bg-primary/90'
                  : 'border-primary/20 hover:bg-primary/10'
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <>
                  {currentStatus === 'planned' ? (
                    <Check className="w-4 h-4 mr-2" />
                  ) : (
                    <CalendarPlus className="w-4 h-4 mr-2" />
                  )}
                </>
              )}
              {currentStatus === 'planned' ? 'Added to trip' : 'Add to trip'}
            </Button>

            <Button
              onClick={() => handleAction('interested')}
              disabled={isLoading}
              variant={currentStatus === 'interested' ? 'secondary' : 'outline'}
              className={`w-full ${
                currentStatus === 'interested'
                  ? 'bg-purple-100 text-purple-900 hover:bg-purple-200'
                  : 'hover:bg-purple-50'
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Heart
                  className={`w-4 h-4 mr-2 ${
                    currentStatus === 'interested' ? 'fill-purple-900' : ''
                  }`}
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
