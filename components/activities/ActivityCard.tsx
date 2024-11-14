// components/activities/ActivityCard.tsx

import { format } from 'date-fns';
import Link from 'next/link';

import { PlacePhotos } from '@/components/places/PlacePhotos';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ActivityCardProps } from '@/lib/types';

export function ActivityCard({ activity, href, className }: ActivityCardProps) {
  // Helper function to format time regardless of type
  const formatTime = (time: Date | string) => {
    const dateObj = typeof time === 'string' ? new Date(time) : time;
    return format(dateObj, 'h:mm a');
  };

  return (
    <div className={`relative pl-6 border-l-2 border-gray-200 ${className}`}>
      <div className="absolute left-[-5px] top-3 w-2 h-2 rounded-full bg-primary" />
      <div className="border rounded-lg hover:border-primary/50 transition-colors overflow-hidden">
        {activity.placeId && (
          <PlacePhotos
            placeId={activity.placeId}
            className="w-full h-32 object-cover"
            maxPhotos={1}
          />
        )}
        <div className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium">{activity.name}</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <p>
                  {formatTime(activity.startTime)} - {formatTime(activity.endTime)}
                </p>
                <Badge variant="secondary">{activity.category}</Badge>
                {activity.priceLevel && <span>{'$'.repeat(activity.priceLevel)}</span>}
              </div>
              {activity.address && (
                <p className="text-sm text-muted-foreground mt-1">{activity.address}</p>
              )}
              {activity.notes && (
                <p className="text-sm text-muted-foreground mt-2">{activity.notes}</p>
              )}
            </div>
            {href && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={href}>View Details</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
