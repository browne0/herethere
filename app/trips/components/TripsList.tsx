'use client';

import { useState } from 'react';

import { format, isAfter, isBefore, isToday } from 'date-fns';
import {
  Calendar,
  Camera,
  ChevronRight,
  Map,
  MapPin,
  MoreVertical,
  Plane,
  Plus,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { CachedImage } from '@/components/CachedImage';
import { ParsedTrip } from '../[tripId]/types';
import { DeleteTripDialog } from './DeleteTripDialog';

interface TripsListProps {
  initialTrips: ParsedTrip[];
}

function groupTripsByStatus(trips: ParsedTrip[]) {
  const now = new Date();
  return {
    upcoming: trips.filter(trip => isAfter(new Date(trip.startDate), now)),
    ongoing: trips.filter(
      trip =>
        (isBefore(new Date(trip.startDate), now) || isToday(new Date(trip.startDate))) &&
        (isAfter(new Date(trip.endDate), now) || isToday(new Date(trip.endDate)))
    ),
    past: trips.filter(trip => isBefore(new Date(trip.endDate), now)),
  };
}

function formatTripDates(startDate: Date, endDate: Date, type: 'short' | 'long' = 'short') {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (type === 'short') {
    // If same month, show "Nov 19-21, 2024"
    if (start.getMonth() === end.getMonth()) {
      return `${format(start, 'MMM d')}-${format(end, 'd, yyyy')}`;
    }
    // If different months, show "Nov 28 - Dec 1, 2024"
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  }

  // Long format always shows month names
  return `${format(start, 'MMMM d')} - ${format(end, 'MMMM d, yyyy')}`;
}

function TripActions({ trip, onDeleteClick }: { trip: ParsedTrip; onDeleteClick: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4"
        >
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Trip options</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {isAfter(new Date(trip.startDate), new Date()) && (
          <DropdownMenuItem asChild>
            <Link href={`#`} className="flex items-center">
              <Calendar className="mr-2 h-4 w-4" />
              Edit Trip
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600 focus:text-red-600" onSelect={onDeleteClick}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Trip
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TripsList({ initialTrips }: TripsListProps) {
  const [tripToDelete, setTripToDelete] = useState<ParsedTrip | null>(null);
  const [trips, setTrips] = useState(initialTrips);
  const router = useRouter();

  const { upcoming, ongoing, past } = groupTripsByStatus(trips);
  const uniqueDestinations = new Set(trips.map(trip => trip.city.name)).size;
  const totalActivities = trips.reduce((acc, trip) => acc + trip.activities.length, 0);

  const handleDeleteTrip = async (tripId: string) => {
    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete trip');
      }

      const result = await response.json();

      // Update local state
      setTrips(trips.filter(t => t.id !== tripId));

      toast.success(`Your ${result.data.city.name} trip has been deleted`, {
        description: `Successfully deleted ${result.data.title}`,
      });

      router.refresh();
    } catch (error) {
      console.error('Error deleting trip:', error);
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to delete trip',
      });
      throw error;
    }
  };

  return (
    <Container>
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 space-y-4 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 sm:py-6 border-b gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Your Travel Plans</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {upcoming.length
                ? `${upcoming.length} upcoming ${upcoming.length === 1 ? 'adventure' : 'adventures'}`
                : 'Start planning your next adventure'}
            </p>
          </div>
          <Button asChild className="hover:bg-blue-700 w-full sm:w-auto">
            <Link href="/trips/new" className="flex items-center justify-center">
              <Plus className="h-4 w-4 mr-2" />
              Plan New Trip
            </Link>
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Active Trip Card */}
          {ongoing.length > 0 && (
            <Link href={ongoing[0]?.id ? `/trips/${ongoing[0].id}` : '/trips/new'}>
              <Card className="hover:shadow-lg transition-all cursor-pointer h-full">
                <CardContent className="p-4 sm:p-6 flex items-start sm:items-center gap-3 sm:gap-4">
                  <div className="bg-blue-50 p-2 sm:p-3 rounded-lg shrink-0">
                    <Plane className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-sm sm:text-base">Active Trip</h3>
                    {ongoing[0] ? (
                      <>
                        <p className="text-lg sm:text-2xl font-bold truncate">
                          {ongoing[0].city.name}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {formatTripDates(ongoing[0].startDate, ongoing[0].endDate, 'short')}
                        </p>
                        <p className="text-xs sm:text-sm text-blue-600 mt-1">View current trip →</p>
                      </>
                    ) : (
                      <>
                        <p className="text-base sm:text-xl text-muted-foreground">
                          No active trips
                        </p>
                        <p className="text-xs sm:text-sm text-blue-600">
                          Plan your next adventure →
                        </p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Your Adventures Card */}
          {uniqueDestinations > 0 && (
            <Link href="#">
              <Card className="hover:shadow-lg transition-all cursor-pointer h-full">
                <CardContent className="p-4 sm:p-6 flex items-start sm:items-center gap-3 sm:gap-4">
                  <div className="bg-purple-50 p-2 sm:p-3 rounded-lg shrink-0">
                    <Map className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-sm sm:text-base">Your Adventures</h3>
                    <p className="text-lg sm:text-2xl font-bold">
                      {uniqueDestinations} {uniqueDestinations === 1 ? 'Place' : 'Places'}
                    </p>
                    <p className="text-xs sm:text-sm text-purple-600">
                      {totalActivities} activities planned →
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-4 space-y-8">
          {/* Active & Upcoming Section */}
          {upcoming.length > 0 ? (
            <section>
              <h2 className="text-lg font-semibold mb-4">Upcoming</h2>
              <div className="space-y-4">
                {upcoming.map(trip => (
                  <Link key={trip.id} href={`/trips/${trip.id}`}>
                    <Card className="group overflow-hidden hover:shadow-lg transition-all mb-8">
                      <div className="grid md:grid-cols-[2fr,1fr]">
                        {/* Trip Info */}
                        <div className="p-6 relative" onClick={e => e.stopPropagation()}>
                          <TripActions trip={trip} onDeleteClick={() => setTripToDelete(trip)} />

                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                {ongoing.includes(trip) ? (
                                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-600 rounded-full">
                                    Active Trip
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-600 rounded-full">
                                    Upcoming
                                  </span>
                                )}
                              </div>
                              <h3 className="text-xl font-semibold mb-2 group-hover:text-blue-600 transition-colors">
                                {trip.title}
                              </h3>
                              <p className="text-gray-500 text-sm">{trip.city.name}</p>
                              <p className="text-gray-500 text-sm">
                                {formatTripDates(trip.startDate, trip.endDate)}
                              </p>
                            </div>
                          </div>

                          {/* Quick Stats */}
                          <div className="flex gap-4 mt-4 text-sm">
                            <div>
                              <p className="text-gray-500">Duration</p>
                              <p className="font-medium">
                                {Math.ceil(
                                  (new Date(trip.endDate).getTime() -
                                    new Date(trip.startDate).getTime()) /
                                    (1000 * 60 * 60 * 24)
                                )}{' '}
                                days
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500">Activities</p>
                              <p className="font-medium">{trip.activities.length || 'None'}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Status</p>
                              <p className="font-medium">
                                {trip.activities.length > 0 ? 'In progress' : 'Not started'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Map Preview - Remove nested Link */}
                        <div className="relative h-48 md:h-auto bg-gray-100">
                          {trip.featuredImage ? (
                            <CachedImage
                              photo={{ url: trip.featuredImage.urls.regular }}
                              alt={trip.featuredImage.alt_description ?? trip.city.name}
                              className="w-full h-full object-cover"
                              author={{
                                name: trip.featuredImage.user.name,
                                url: `${trip.featuredImage.user.links.html}?utm_source=herethere&utm_medium=referral`,
                              }}
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                              <Camera className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ) : (
            <Card className="p-6">
              <div className="flex flex-col items-center text-center py-6">
                <div className="p-3 bg-gray-50 rounded-full mb-4">
                  <Calendar className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">No upcoming trips</h3>
                <p className="text-sm text-gray-500 mb-4 max-w-sm">
                  {upcoming.length === 1
                    ? 'You have one trip in your quick actions above. Add more trips to see them here.'
                    : 'Get started by planning your next adventure. Your upcoming trips will appear here.'}
                </p>
                <Button asChild className="hover:bg-blue-700">
                  <Link href="/trips/new" className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Plan New Trip
                  </Link>
                </Button>
              </div>
            </Card>
          )}

          {/* Past Trips Section */}
          {past.length > 0 && (
            <Card className="mt-6">
              <CardContent className="p-0">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-medium">Past Adventures</h2>
                      <p className="text-sm text-gray-500">Your travel history</p>
                    </div>
                    {past.length > 3 && (
                      <Button variant="ghost" size="sm" asChild>
                        <Link href="/trips/past">View All</Link>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="divide-y">
                  {past.slice(0, 3).map(trip => (
                    <div key={trip.id} className="relative group">
                      <Link
                        href={`/trips/${trip.id}`}
                        className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-gray-100">
                            <MapPin className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <h3 className="font-medium">{trip.city.name}</h3>
                            <p className="text-sm text-gray-500">
                              {formatTripDates(trip.startDate, trip.endDate, 'short')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">
                            {trip.activities.length}{' '}
                            {trip.activities.length === 1 ? 'activity' : 'activities'}
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </Link>
                      <TripActions trip={trip} onDeleteClick={() => setTripToDelete(trip)} />
                    </div>
                  ))}

                  {past.length > 3 && (
                    <div className="p-4 text-center bg-gray-50">
                      <p className="text-sm text-gray-500">
                        +{past.length - 3} more past {past.length - 3 === 1 ? 'trip' : 'trips'}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <DeleteTripDialog
        isOpen={!!tripToDelete}
        onClose={() => setTripToDelete(null)}
        onDelete={handleDeleteTrip}
        trip={tripToDelete}
      />
    </Container>
  );
}
