import { useState } from 'react';

import { ActivityRecommendation } from '@prisma/client';
import { Heart, Loader2, Star, Clock, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { useActivitiesStore } from '@/lib/stores/activitiesStore';
import { formatNumberIntl } from '@/lib/utils';

interface ActivityCardProps {
  activity: ActivityRecommendation;
  onAdd: (activity: ActivityRecommendation) => Promise<void>;
}

function getDurationDisplay(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes}m`
    : `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

function getPriceDisplay(level: string) {
  switch (level) {
    case 'FREE':
      return 'Free';
    case 'LOW':
      return '$';
    case 'MODERATE':
      return '$$';
    case 'HIGH':
      return '$$$';
    case 'VERY_HIGH':
      return '$$$$';
    default:
      return '';
  }
}

export function ActivityCard({ activity, onAdd }: ActivityCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const { activities, tripId } = useActivitiesStore();
  const router = useRouter();
  const addedActivityIds = new Set(activities.map(a => a.recommendationId));
  const isAdded = addedActivityIds.has(activity.id);

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
    <div className="relative flex-shrink-0 w-72 bg-white shadow-md hover:shadow-lg transition-shadow rounded-xl overflow-hidden flex flex-col">
      <div className="relative aspect-[4/3]">
        <img
          src={activity.images.urls[0].url}
          alt={activity.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
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

      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="font-medium">{activity.rating?.toFixed(1)}</span>
            <span className="text-gray-600">({formatNumberIntl(activity.reviewCount)})</span>
            <span className="text-gray-600 mx-1">·</span>
            <span className="text-gray-600">{getDurationDisplay(activity.duration)}</span>
          </div>
        </div>

        <h3 className="font-medium text-base leading-tight">{activity.name}</h3>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{activity.location.neighborhood}</span>
          </div>
        </div>

        <button
          onClick={handleAdd}
          disabled={isLoading || isAdded}
          className={`
            mt-2 w-full py-2 px-4 rounded-lg
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
  );
}

export default ActivityCard;
