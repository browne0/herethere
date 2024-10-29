'use client';
import { format } from 'date-fns';
import { MapPin, Clock, ExternalLink, ImageIcon, Replace, Lock, Check } from 'lucide-react';

import { PlacePhotos } from '@/components/places/PlacePhotos';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DemoActivity } from '@/lib/types';

interface ActivityCardProps {
  activity: DemoActivity;
  onSignUpClick: () => void;
}

const PriceLevel = ({ level }: { level?: 1 | 2 | 3 | 4 }) => {
  if (!level) return null;

  const renderPriceSymbols = () => {
    const symbols = ['$', '$', '$', '$'];
    return (
      <span className="flex mb-1">
        {symbols.map((symbol, index) => (
          <span key={index} className={index < level ? 'text-primary' : 'text-muted-foreground/30'}>
            {symbol}
          </span>
        ))}
      </span>
    );
  };
  return <div className="flex items-center gap-1 text-sm">{renderPriceSymbols()}</div>;
};

export function ActivityCard({ activity, onSignUpClick }: ActivityCardProps) {
  console.log(activity);
  return (
    <div className="relative pl-6 border-l-2 border-gray-200">
      <div className="absolute left-[-5px] top-3 w-2 h-2 rounded-full bg-primary" />
      <div className="border rounded-lg overflow-hidden hover:border-primary/50 transition-all duration-300">
        {/* Real place photo */}
        <div className="h-48 bg-gray-100 relative">
          {activity.placeId ? (
            <PlacePhotos
              placeId={activity.placeId}
              className="w-full h-full rounded-t-lg"
              maxPhotos={1}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-muted">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <Badge
            className="absolute top-4 right-4"
            variant={
              activity.type === 'DINING'
                ? 'default'
                : activity.type === 'SIGHTSEEING'
                  ? 'secondary'
                  : 'outline'
            }
          >
            {activity.type}
          </Badge>
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-lg">{activity.name}</h3>
          <PriceLevel level={activity.priceLevel} />

          {/* Time and Type */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>
                {format(new Date(activity.startTime), 'h:mm a')} -{' '}
                {format(new Date(activity.endTime), 'h:mm a')}
              </span>
            </div>
          </div>

          {/* Address with Map Preview Teaser */}
          <div className="flex items-start gap-2 text-sm text-muted-foreground mb-3">
            <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
            <div>
              <p>{activity.address}</p>
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto text-primary mt-1"
                onClick={onSignUpClick}
              >
                View on map
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-4">{activity.notes}</p>

          {/* Additional Features Teaser */}
          <div className="border-t pt-4 mt-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Button variant="outline" size="sm" className="w-full" onClick={onSignUpClick}>
                <Clock className="w-4 h-4 mr-2" />
                Adjust Time
              </Button>
              <Button variant="outline" size="sm" className="w-full" onClick={onSignUpClick}>
                <Replace className="w-4 h-4 mr-2" />
                Find Alternative
              </Button>
            </div>
          </div>

          {/* Premium Features Teaser */}
          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Lock className="w-3 h-3" />
              Premium Features
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3" /> Reservations & Booking
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3" /> Real-time Availability
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3 h-3" /> Local Tips & Insights
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
