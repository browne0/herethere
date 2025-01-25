import { Clock, MapPin, Star } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import type { ParsedItineraryActivity } from '@/app/trips/[tripId]/types';
import { Lightbox } from '@/components/Lightbox';
import { TikTokEmbed } from '@/components/tiktok/TikTokEmbed';
import { Badge } from '@/components/ui/badge';
import { SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useActivitiesStore } from '@/lib/stores/activitiesStore';
import type { ActivityRecommendation } from '@/lib/types/recommendations';
import { TikTokVideo } from '@/lib/types/recommendations';
import { cn, formatNumberIntl } from '@/lib/utils';
import { getPrimaryTypeDisplay } from './RecommendationsView/ActivityCard';

type ActivityDetailSheetProps = {
  isOpen: boolean;
} & (
  | {
      type: 'recommendation';
      activity: ActivityRecommendation;
    }
  | {
      type: 'itinerary';
      activity: ParsedItineraryActivity;
    }
);

function getDurationDisplay(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes}m`
    : `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

export function ActivityDetailSheet({ activity, type, isOpen }: ActivityDetailSheetProps) {
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const { trip } = useActivitiesStore();
  const [tiktokVideos, setTiktokVideos] = useState<TikTokVideo[]>([]);

  // Get the recommendation object regardless of activity type
  const recommendation = type === 'itinerary' ? activity.recommendation : activity;

  useEffect(() => {
    const fetchTikTokVideos = async () => {
      if (!isOpen || !trip) return;

      const lastSync = recommendation.lastTikTokSync;
      const needsSync =
        !lastSync || new Date().getTime() - new Date(lastSync).getTime() > 30 * 24 * 60 * 60 * 1000;

      if (needsSync) {
        setIsLoadingVideos(true);
        try {
          const response = await fetch(
            `/api/tiktok?name=${encodeURIComponent(recommendation.name)}&activityId=${recommendation.id}&city=${trip.city.name}&country=${trip.city.countryCode}`
          );
          const data = await response.json();
          if (response.ok) {
            setTiktokVideos(data);
          }
        } catch (error) {
          console.error('Error fetching TikTok videos:', error);
        } finally {
          setIsLoadingVideos(false);
        }
      } else if (recommendation.tiktokVideos.length > 0) {
        setTiktokVideos(recommendation.tiktokVideos);
      }
    };

    fetchTikTokVideos();
  }, [recommendation, isOpen, trip]);

  const images = recommendation.images as unknown as {
    urls: Array<{ url: string; cdnUrl: string }>;
  };

  return (
    <SheetContent
      side="activity-right"
      className={cn('px-0 pb-0 pt-0 w-full border-0 lg:w-1/2 flex flex-col overflow-y-auto', {
        'h-screen lg:top-[65px] lg:h-[calc(100vh-65px)]': type === 'itinerary',
        'h-screen lg:top-[144px] lg:h-[calc(100vh-144px)]': type === 'recommendation',
      })}
      circleClose
      onInteractOutside={e => {
        e.preventDefault();
      }}
    >
      <div className="h-[400px] relative flex-shrink-0">
        <Lightbox images={images?.urls} alt={recommendation.name} />
        {recommendation.isMustSee && (
          <div className="absolute top-4 left-4">
            <Badge className="bg-amber-400 hover:bg-amber-400 text-black font-medium">
              Must See
            </Badge>
          </div>
        )}
      </div>

      <div className="p-4 pt-0">
        <SheetHeader>
          <SheetTitle className="text-2xl text-left">{recommendation.name}</SheetTitle>
          <SheetDescription className="sr-only">{`Information about ${recommendation.name}`}</SheetDescription>
        </SheetHeader>

        <div className="space-y-2 mt-2">
          <div className="flex items-center">
            <div className="flex items-center">
              <Star className="h-4 w-4 text-yellow-400" />
              <span className="ml-1 font-medium">{recommendation.rating}</span>
            </div>
            <span className="text-gray-500 ml-1">
              ({formatNumberIntl(recommendation.reviewCount)} reviews)
            </span>
          </div>
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
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Badge className="capitalize">{getPrimaryTypeDisplay(recommendation)}</Badge>
        </div>

        {recommendation.description && (
          <div className="mt-4 text-gray-600">
            <h3 className="font-medium text-gray-900 mb-2">About</h3>
            <p>{recommendation.description}</p>
          </div>
        )}

        {isLoadingVideos ? (
          <div className="mt-4">
            <h2 className="text-xl font-bold mb-2">Related videos from TikTok</h2>
            <div className="relative">
              <div className="overflow-x-auto">
                <div className="flex gap-4 pb-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex-shrink-0 w-[325px] h-[578px]">
                      <div className="w-full h-full bg-gray-100 rounded-lg animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : tiktokVideos.length > 0 ? (
          <div className="mt-4">
            <h2 className="text-xl font-bold mb-2">Related videos from TikTok</h2>
            <div className="relative">
              <div className="overflow-x-auto">
                <div className="flex gap-4 pb-4">
                  {tiktokVideos.map(({ video_id }) => (
                    <div key={video_id} className="flex-shrink-0">
                      <TikTokEmbed videoId={video_id} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </SheetContent>
  );
}
