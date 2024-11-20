import { useState } from 'react';

import { Heart, Loader2 } from 'lucide-react';

import { formatPrice } from '@/lib/utils';

import { ParsedActivityRecommendation } from '../../types';

interface ActivityCardProps {
  activity: ParsedActivityRecommendation;
  onAdd: (activity: ParsedActivityRecommendation) => Promise<void>;
  isAdded: boolean;
}

function getDurationDisplay(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes}m`
    : `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

export function ActivityCard({ activity, onAdd, isAdded }: ActivityCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

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
    <div className="relative flex-shrink-0 w-72 h-[25rem] rounded-xl overflow-hidden bg-white shadow-md hover:shadow-lg transition-shadow flex flex-col">
      <div className="relative aspect-[4/3] flex-shrink-0">
        <img
          src={'https://placehold.co/400x300'}
          alt={activity.name}
          className="w-full h-full object-cover"
        />
        <button
          onClick={handleFavorite}
          className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white transition-colors"
          aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart
            className={`w-5 h-5 ${isFavorited ? 'fill-current text-red-500' : 'text-gray-600'}`}
          />
        </button>
        {activity.category && (
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-white/90 text-gray-800">
              {activity.category}
            </span>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <div className="flex items-center gap-2 text-sm mb-1">
          <div className="flex items-center gap-1">
            <span className="font-medium">{activity.rating?.toFixed(2) || 'New'}</span>
            <span className="text-gray-600">({activity.reviewCount})</span>
          </div>
          <span className="text-gray-600">·</span>
          <span className="text-gray-600">{getDurationDisplay(activity.duration)}</span>
        </div>

        <h3 className="font-medium text-lg leading-tight mb-1 line-clamp-2">{activity.name}</h3>
        <p className="text-gray-600">From {formatPrice(activity.price)} / person</p>

        <div className="flex-grow" />

        <button
          onClick={handleAdd}
          disabled={isLoading || isAdded}
          className={`
            mt-3 w-full py-2 px-4 rounded-lg
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
