import { useState } from 'react';

import { ActivityRecommendation } from '@prisma/client';
import { Heart, Loader2, Star, MapPin } from 'lucide-react';

import { CachedImage, ImageUrl } from '@/components/CachedImage';
import { Badge } from '@/components/ui/badge';
import { useActivitiesStore } from '@/lib/stores/activitiesStore';
import { formatNumberIntl } from '@/lib/utils';
import { MUSEUM_TYPES, RESTAURANT_TYPES } from '@/constants';

type RestaurantTypes = typeof RESTAURANT_TYPES;
type RestaurantType = keyof RestaurantTypes;
type MuseumTypes = typeof MUSEUM_TYPES;
type MuseumType = keyof MuseumTypes;

interface ActivityCardProps {
  activity: ActivityRecommendation;
  onAdd: (activity: ActivityRecommendation) => Promise<void>;
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

  const scoredUrls = images.urls.map((imageUrl, index) => {
    let score = 0;

    // Prefer CDN URLs as they're likely optimized
    if (imageUrl.cdnUrl) score += 5;

    // Score based on dimensions if available
    const dimensions = getDimensionsFromUrl(imageUrl.cdnUrl || imageUrl.url);
    console.log(dimensions);
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

export function ActivityCard({ activity, onAdd }: ActivityCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const { activities } = useActivitiesStore();
  const addedActivityIds = new Set(activities.map(a => a.recommendationId));
  const isAdded = addedActivityIds.has(activity.id);

  // Parse the images JSON to get the photo reference
  const images = activity.images as unknown as ActivityImages;
  const photoUrl = getBestImageUrl(images);

  // Safely extract photo reference
  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAdded || isLoading) return;

    setIsLoading(true);
    try {
      await onAdd(activity);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorited(!isFavorited);
  };

  return (
    <div className="w-72 bg-white shadow-md hover:shadow-lg transition-shadow rounded-xl overflow-hidden flex-shrink-0">
      {/* Fixed height container for consistent card sizing */}
      <div className="h-80 flex flex-col">
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
          {activity.isMustSee && (
            <div className="absolute top-3 left-3">
              <Badge className="bg-amber-400 hover:bg-amber-400 text-black font-medium px-2 py-1">
                Must See
              </Badge>
            </div>
          )}
          <button
            onClick={handleFavorite}
            className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white transition-colors"
          >
            <Heart
              className={`w-5 h-5 ${isFavorited ? 'fill-current text-red-500' : 'text-gray-600'}`}
            />
          </button>
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

          <h3 className="font-medium text-base leading-tight mb-2 line-clamp-2">{activity.name}</h3>
          <p className="text-sm gap-1 mb-2 ">{getPrimaryTypeDisplay(activity)}</p>
          <p className="flex items-center gap-1.5 text-sm text-gray-600 mb-2">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">
              {(activity.location as { neighborhood: string })?.neighborhood ||
                'Location unavailable'}
            </span>
          </p>

          {/* Push button to bottom */}
          <div className="flex-grow" />

          <button
            onClick={handleAdd}
            disabled={isLoading || isAdded}
            className={`
              w-full py-2 px-4 rounded-lg
              font-medium text-sm
              transition-all duration-200
              flex items-center justify-center gap-2
              ${
                isAdded
                  ? 'bg-green-50 text-green-600 border border-green-200 cursor-default'
                  : isLoading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
              }
            `}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Adding...
              </>
            ) : isAdded ? (
              'Added to trip'
            ) : (
              'Add to trip'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ActivityCard;
