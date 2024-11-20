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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Simplified Header */}
        <div className="flex items-center justify-between py-6 border-b">
          <div>
            <h1 className="text-2xl font-bold">Your Travel Plans</h1>
            <p className="text-muted-foreground">
              {upcoming.length
                ? `${upcoming.length} upcoming ${upcoming.length === 1 ? 'adventure' : 'adventures'}`
                : 'Start planning your next adventure'}
            </p>
          </div>
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link href="/trips/new">
              <Plus className="h-4 w-4 mr-2" />
              Plan New Trip
            </Link>
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href={ongoing[0]?.id ? `/trips/${ongoing[0].id}` : '/trips/new'}>
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <Plane className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium">Active Trip</h3>
                  {ongoing[0] ? (
                    <>
                      <p className="text-2xl font-bold">{ongoing[0].destination}</p>
                      <p className="text-sm text-gray-500">
                        {formatTripDates(ongoing[0].startDate, ongoing[0].endDate, 'short')}
                      </p>
                      <p className="text-sm text-blue-600 mt-1">View current trip →</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xl text-muted-foreground">No active trips</p>
                      <p className="text-sm text-blue-600">Plan your next adventure →</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href={upcoming[0]?.id ? `/trips/${upcoming[0].id}` : '/trips/new'}>
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-green-50 p-3 rounded-lg">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium">Next Trip</h3>
                  {upcoming[0] ? (
                    <>
                      <p className="text-2xl font-bold">{upcoming[0].destination}</p>
                      <p className="text-sm text-gray-500">
                        {formatTripDates(upcoming[0].startDate, upcoming[0].endDate, 'short')}
                      </p>
                      <p className="text-sm text-green-600 mt-1">Continue planning →</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xl text-muted-foreground">None planned</p>
                      <p className="text-sm text-green-600">Start planning →</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href={past.length > 0 ? '/trips?filter=past' : '#'}>
            <Card className="hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-purple-50 p-3 rounded-lg">
                  <Map className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium">Your Adventures</h3>
                  <p className="text-2xl font-bold">{uniqueDestinations} Places</p>
                  <p className="text-sm text-purple-600">{totalActivities} activities planned →</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Trip Lists */}
        <div className="grid gap-6 md:grid-cols-2">
          {[...ongoing, ...upcoming].slice(0, 2).map((trip, index) => (
            <Link key={trip.id} href={`/trips/${trip.id}`}>
              <Card className="hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex gap-2 items-center mb-2">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-600 rounded-full">
                          {isToday(new Date(trip.startDate))
                            ? 'Today'
                            : ongoing.includes(trip)
                              ? 'Now'
                              : format(new Date(trip.startDate), 'MMM d')}
                        </span>
                        {/* Add a duration badge if it's the same city */}
                        {index > 0 &&
                          trip.destination === [...ongoing, ...upcoming][index - 1].destination && (
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
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        {trip.destination}
                        {/* If same city as previous trip, show a visual differentiator */}
                        {index > 0 &&
                          trip.destination === [...ongoing, ...upcoming][index - 1].destination && (
                            <span className="text-sm font-normal text-gray-500">
                              • Trip {index + 1}
                            </span>
                          )}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatTripDates(trip.startDate, trip.endDate, 'long')}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      {trip.activities.length > 0 ? 'Continue →' : 'Start planning →'}
                    </Button>
                  </div>
                  <div className="mt-4 flex items-center gap-4">
                    <span className="text-sm text-gray-600">
                      {Math.ceil(
                        (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )}{' '}
                      days
                    </span>
                    <span className="text-sm text-gray-600">•</span>
                    <span className="text-sm font-medium text-blue-600">
                      {trip.activities.length === 0
                        ? 'Add first activity'
                        : `${trip.activities.length} ${trip.activities.length === 1 ? 'activity' : 'activities'} planned`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </Container>
  );
}
