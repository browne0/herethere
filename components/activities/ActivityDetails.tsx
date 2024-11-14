'use client';
import React from 'react';

import { type Activity } from '@prisma/client';
import { format } from 'date-fns';
import { ArrowLeft, Clock, MapPin, Edit, Trash2, Navigation2, Globe } from 'lucide-react';
import Link from 'next/link';

import { PlacePhotos } from '@/components/places/PlacePhotos';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ACTIVITY_CATEGORIES } from '@/lib/types/activities';
import { cn } from '@/lib/utils';

interface ActivityDetailsProps {
  activity: Activity;
  tripId: string;
}

type CategoryStyle = { color: string; bg: string };

const CATEGORY_COLORS: Record<keyof typeof ACTIVITY_CATEGORIES, CategoryStyle> = {
  BEACHES: {
    color: 'text-cyan-700',
    bg: 'bg-cyan-50',
  },
  CITY_SIGHTSEEING: {
    color: 'text-blue-700',
    bg: 'bg-blue-50',
  },
  OUTDOOR_ADVENTURES: {
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
  },
  FESTIVALS_EVENTS: {
    color: 'text-purple-700',
    bg: 'bg-purple-50',
  },
  FOOD_EXPLORATION: {
    color: 'text-orange-700',
    bg: 'bg-orange-50',
  },
  NIGHTLIFE: {
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
  },
  SHOPPING: {
    color: 'text-pink-700',
    bg: 'bg-pink-50',
  },
  SPA_WELLNESS: {
    color: 'text-teal-700',
    bg: 'bg-teal-50',
  },
} as const;

interface ActivityCategoryBadgeProps {
  category?: string;
  className?: string;
}

export function ActivityCategoryBadge({ category, className }: ActivityCategoryBadgeProps) {
  // Convert category to match our keys and get colors
  const categoryKey = category?.toUpperCase() as keyof typeof ACTIVITY_CATEGORIES;
  const categoryStyle = CATEGORY_COLORS[categoryKey] || {
    color: 'text-gray-700',
    bg: 'bg-gray-50',
  };

  // Get the display label from our categories
  const categoryLabel = ACTIVITY_CATEGORIES[categoryKey]?.label || category;

  return (
    <Badge
      variant="secondary"
      className={cn(categoryStyle.color, categoryStyle.bg, 'border-none font-medium', className)}
    >
      {categoryLabel}
    </Badge>
  );
}

const ActivityDetails: React.FC<ActivityDetailsProps> = ({ activity, tripId }) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/trips/${tripId}/activities/${activity.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        window.location.href = `/trips/${tripId}`;
      }
    } catch (error) {
      console.error('Failed to delete activity:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-6 flex justify-between items-center">
        <Link
          href={`/trips/${tripId}`}
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Trip
        </Link>
        <div className="space-x-2">
          <Link href={`/trips/${tripId}/activities/${activity.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="space-y-2">
                <ActivityCategoryBadge category={activity.category} />
                <CardTitle>{activity.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center text-muted-foreground">
                <Clock className="w-4 h-4 mr-2 shrink-0" />
                <span>
                  {format(new Date(activity.startTime), 'MMM d, yyyy h:mm a')} -{' '}
                  {format(new Date(activity.endTime), 'h:mm a')}
                </span>
              </div>

              {activity.address && (
                <div className="flex items-start text-muted-foreground">
                  <MapPin className="w-4 h-4 mr-2 shrink-0 mt-1" />
                  <span>{activity.address}</span>
                </div>
              )}

              {activity.notes && (
                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{activity.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {activity.placeId && (
            <Card>
              <CardHeader>
                <CardTitle>Photos</CardTitle>
              </CardHeader>
              <CardContent>
                <PlacePhotos placeId={activity.placeId} maxPhotos={3} className="h-64" />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-square rounded-lg overflow-hidden bg-muted relative">
                <iframe
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  style={{ border: 0 }}
                  src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${activity.latitude},${activity.longitude}`}
                  allowFullScreen
                />
              </div>
              <div className="mt-4 space-y-2">
                <Button variant="outline" className="w-full" asChild>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${activity.latitude},${activity.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Navigation2 className="w-4 h-4 mr-2" />
                    Get Directions
                  </a>
                </Button>
                {activity.placeId && (
                  <Button variant="outline" className="w-full" asChild>
                    <a
                      href={`https://www.google.com/maps/place/?q=place_id:${activity.placeId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      View on Google Maps
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this activity? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ActivityDetails;
