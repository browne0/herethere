import { auth } from '@clerk/nextjs/server';
import { Trip } from '@prisma/client';
import { format, isAfter, isBefore, isToday } from 'date-fns';
import { Calendar, Plus, Plane, Map, ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { Container } from '@/components/layouts/container';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { prisma } from '@/lib/db';

interface TripWithActivities extends Trip {
  activities: Array<{
    id: string;
    name: string;
    startTime: Date;
    endTime: Date;
  }>;
}

function groupTripsByStatus(trips: TripWithActivities[]) {
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

export default async function TripsPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const trips = await prisma.trip.findMany({
    where: { userId },
    orderBy: { startDate: 'desc' },
    include: {
      activities: true,
    },
  });

  const { upcoming, ongoing, past } = groupTripsByStatus(trips);

  const uniqueDestinations = new Set(trips.map(trip => trip.destination)).size;
  const totalActivities = trips.reduce((acc, trip) => acc + trip.activities.length, 0);

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
          <Button asChild className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
            <Link href="/trips/new" className="flex items-center justify-center">
              <Plus className="h-4 w-4 mr-2" />
              Plan New Trip
            </Link>
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Active Trip Card */}
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
                        {ongoing[0].destination}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {formatTripDates(ongoing[0].startDate, ongoing[0].endDate, 'short')}
                      </p>
                      <p className="text-xs sm:text-sm text-blue-600 mt-1">View current trip →</p>
                    </>
                  ) : (
                    <>
                      <p className="text-base sm:text-xl text-muted-foreground">No active trips</p>
                      <p className="text-xs sm:text-sm text-blue-600">Plan your next adventure →</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Next Trip Card */}
          <Link href={upcoming[0]?.id ? `/trips/${upcoming[0].id}` : '/trips/new'}>
            <Card className="hover:shadow-lg transition-all cursor-pointer h-full">
              <CardContent className="p-4 sm:p-6 flex items-start sm:items-center gap-3 sm:gap-4">
                <div className="bg-green-50 p-2 sm:p-3 rounded-lg shrink-0">
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-sm sm:text-base">Next Trip</h3>
                  {upcoming[0] ? (
                    <>
                      <p className="text-lg sm:text-2xl font-bold truncate">
                        {upcoming[0].destination}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {formatTripDates(upcoming[0].startDate, upcoming[0].endDate, 'short')}
                      </p>
                      <p className="text-xs sm:text-sm text-green-600 mt-1">Continue planning →</p>
                    </>
                  ) : (
                    <>
                      <p className="text-base sm:text-xl text-muted-foreground">None planned</p>
                      <p className="text-xs sm:text-sm text-green-600">Start planning →</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Your Adventures Card */}
          <Link href={past.length > 0 ? '/trips?filter=past' : '#'}>
            <Card className="hover:shadow-lg transition-all cursor-pointer h-full">
              <CardContent className="p-4 sm:p-6 flex items-start sm:items-center gap-3 sm:gap-4">
                <div className="bg-purple-50 p-2 sm:p-3 rounded-lg shrink-0">
                  <Map className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-sm sm:text-base">Your Adventures</h3>
                  <p className="text-lg sm:text-2xl font-bold">{uniqueDestinations} Places</p>
                  <p className="text-xs sm:text-sm text-purple-600">
                    {totalActivities} activities planned →
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Trips List */}
        {(ongoing.length > 0 || upcoming.length > 0) && (
          <div>
            <h2 className="text-lg font-semibold mb-3 px-1">Current & Upcoming</h2>
            <div className="grid gap-3 sm:gap-6 grid-cols-1 lg:grid-cols-2">
              {[...ongoing, ...upcoming].slice(0, 2).map((trip, index) => (
                <Link key={trip.id} href={`/trips/${trip.id}`}>
                  <Card className="hover:shadow-lg transition-all h-full">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 sm:gap-0">
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-2 items-center mb-2">
                            <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-600 rounded-full">
                              {isToday(new Date(trip.startDate))
                                ? 'Today'
                                : ongoing.includes(trip)
                                  ? 'Active'
                                  : format(new Date(trip.startDate), 'MMM d')}
                            </span>
                            {index > 0 &&
                              trip.destination ===
                                [...ongoing, ...upcoming][index - 1].destination && (
                                <span className="inline-block px-2 py-1 text-xs bg-purple-100 text-purple-600 rounded-full">
                                  {Math.ceil(
                                    (new Date(trip.endDate).getTime() -
                                      new Date(trip.startDate).getTime()) /
                                      (1000 * 60 * 60 * 24)
                                  )}{' '}
                                  days
                                </span>
                              )}
                          </div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg sm:text-xl font-bold truncate">
                              {trip.destination}
                            </h3>
                            {index > 0 &&
                              trip.destination ===
                                [...ongoing, ...upcoming][index - 1].destination && (
                                <span className="text-sm font-normal text-gray-500 whitespace-nowrap">
                                  • Trip {index + 1}
                                </span>
                              )}
                          </div>
                          <p className="text-xs sm:text-sm text-gray-500">
                            {formatTripDates(trip.startDate, trip.endDate, 'long')}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto whitespace-nowrap"
                        >
                          {trip.activities.length > 0 ? 'Continue →' : 'Start planning →'}
                        </Button>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                        <span className="text-gray-600">
                          {Math.ceil(
                            (new Date(trip.endDate).getTime() -
                              new Date(trip.startDate).getTime()) /
                              (1000 * 60 * 60 * 24)
                          )}{' '}
                          days
                        </span>
                        <span className="text-gray-600">•</span>
                        <span className="font-medium text-blue-600">
                          {trip.activities.length === 0
                            ? 'Add first activity'
                            : `${trip.activities.length} ${
                                trip.activities.length === 1 ? 'activity' : 'activities'
                              } planned`}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {trips.length === 0 && (
          <Card className="p-6 sm:p-12 text-center">
            <h3 className="text-lg sm:text-xl font-medium mb-2">Ready to start your adventure?</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-6">
              Create your first trip and begin planning your perfect getaway.
            </p>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/trips/new" className="flex items-center justify-center">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Trip
              </Link>
            </Button>
          </Card>
        )}
      </div>
    </Container>
  );
}
