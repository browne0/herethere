'use client';

import { Clock, MapPin, Star } from 'lucide-react';
import Link from 'next/link';

import ImageSlider from '@/components/ImageSlider';
import { Badge } from '@/components/ui/badge';
import { SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useActivitiesStore } from '@/lib/stores/activitiesStore';
import { formatNumberIntl } from '@/lib/utils';

interface ActivityDetailSheetProps {
  activityId: string | null;
}

function getDurationDisplay(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes}m`
    : `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

export function ActivityDetailSheet({ activityId }: ActivityDetailSheetProps) {
  const { findActivityByRecommendationId } = useActivitiesStore();
  const activity = activityId ? findActivityByRecommendationId(activityId) : null;

  if (!activity) return null;

  const { recommendation } = activity;
  const images = recommendation.images as unknown as {
    urls: Array<{ url: string; cdnUrl: string }>;
  };

  return (
    <SheetContent
      side="activity-right"
      className="px-0 pb-0 pt-0 rounded-l-lg w-6/12 top-[65px] h-[calc(100vh-65px)]"
      circleClose
    >
      <div className="h-[400px] relative">
        <ImageSlider
          images={images?.urls}
          alt={recommendation.name}
          activityId={recommendation.id}
        />
        {recommendation.isMustSee && (
          <div className="absolute top-4 left-4">
            <Badge className="bg-amber-400 hover:bg-amber-400 text-black font-medium">
              Must See
            </Badge>
          </div>
        )}
      </div>

      <div className="p-6">
        <SheetHeader>
          <SheetTitle className="text-xl">{recommendation.name}</SheetTitle>
          <SheetDescription className="sr-only">{`Information about ${recommendation.name}`}</SheetDescription>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center">
              <Star className="h-4 w-4 text-yellow-400" />
              <span className="ml-1 font-medium">{recommendation.rating}</span>
            </div>
            <span className="text-gray-500">
              ({formatNumberIntl(recommendation.reviewCount)} reviews)
            </span>
          </div>
        </SheetHeader>

        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="h-4 w-4" />
            <span>{getDurationDisplay(recommendation.duration)}</span>
          </div>

          <div className="flex items-start gap-2 text-gray-600">
            <MapPin className="h-4 w-4 mt-1" />
            <div>
              <Link
                href={`https://www.google.com/maps/place/?q=place_id:${recommendation.googlePlaceId}`}
                target="_blank"
                className="hover:text-blue-600 hover:underline"
              >
                {recommendation.location.address}
              </Link>
              <div className="text-sm text-gray-500">{recommendation.location.neighborhood}</div>
            </div>
          </div>

          {recommendation.description && (
            <div className="mt-4 text-gray-600">
              <h3 className="font-medium text-gray-900 mb-2">About</h3>
              <p>{recommendation.description}</p>
            </div>
          )}
        </div>
      </div>
    </SheetContent>
  );
}
