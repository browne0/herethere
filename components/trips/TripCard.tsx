'use client';
import { useState } from 'react';

import { Trip } from '@prisma/client';
import { format, differenceInDays, isAfter, isBefore, isToday } from 'date-fns';
import { Calendar, MapPin, MoreVertical, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getTripTimingText } from '@/lib/utils';

import { TripShareDialog } from './TripShareDialog';
import { CityPhoto } from '../photos/CityPhoto';

interface TripCardProps {
  trip: Trip & {
    activities?: any[];
  };
}

export function TripCard({ trip }: TripCardProps) {
  const router = useRouter();
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const tripDuration = differenceInDays(new Date(trip.endDate), new Date(trip.startDate)) + 1;
  const now = new Date();
  const isActive =
    (isBefore(new Date(trip.startDate), now) || isToday(new Date(trip.startDate))) &&
    (isAfter(new Date(trip.endDate), now) || isToday(new Date(trip.endDate)));
  const tripTiming = getTripTimingText(trip.startDate, trip.endDate);

  async function deleteTrip() {
    try {
      setDeleteLoading(true);
      const response = await fetch(`/api/trips/${trip.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to delete trip');
      }

      setDeleteDialogOpen(false);
      router.push('/trips');
      router.refresh();
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete trip');
    } finally {
      setDeleteLoading(false);
    }
  }

  console.log(trip);

  return (
    <>
      <Card className="group hover:shadow-lg transition-all">
        <CardHeader className="p-0">
          <div className="relative h-48 overflow-hidden rounded-t-lg">
            {trip.placeId ? (
              <CityPhoto
                city={trip.destination}
                placeId={trip.placeId}
                className="w-full h-full"
                height="auto"
                showLoadingState={true}
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <MapPin className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/60" />
            <div className="absolute top-4 right-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/trips/${trip.id}/edit`} className="w-full">
                      Edit Trip
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={e => {
                      e.preventDefault();
                      setShareDialogOpen(true);
                    }}
                  >
                    Share Trip
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => setDeleteDialogOpen(true)}
                    className="text-destructive"
                  >
                    Delete Trip
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="absolute bottom-4 left-4 right-4">
              <h3 className="text-lg font-semibold text-white mb-1">
                {trip.title || `Trip to ${trip.destination}`}
              </h3>
              <div className="flex items-center gap-2 text-white/90 text-sm">
                <MapPin className="h-4 w-4" />
                {trip.destination}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  {format(new Date(trip.startDate), 'MMM d')} -{' '}
                  {format(new Date(trip.endDate), 'MMM d, yyyy')}
                </span>
              </div>
              <Badge variant={tripTiming.variant}>{isActive ? 'Active' : tripTiming.text}</Badge>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div>
                {tripDuration} {tripDuration === 1 ? 'day' : 'days'}
              </div>
              <div>•</div>
              <div>
                {trip.activities?.length || 0}{' '}
                {(trip.activities?.length || 0) === 1 ? 'activity' : 'activities'}
              </div>
            </div>

            <Button asChild className="w-full">
              <Link href={`/trips/${trip.id}`}>View Trip</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Share Dialog */}
      <TripShareDialog
        trip={trip}
        activityCount={trip.activities?.length || 0}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your trip and all its
              activities.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteTrip}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Trip'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
