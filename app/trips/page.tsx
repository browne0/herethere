// app/trips/page.tsx

import { auth } from '@clerk/nextjs/server';
import { Trip } from '@prisma/client';
import { format, isAfter, isBefore, isToday } from 'date-fns';
import { Calendar, Plus, Plane, Map, Filter } from 'lucide-react';
import Link from 'next/link';

import { Container } from '@/components/layouts/container';
import { TripCard } from '@/components/trips/TripCard';
import TripEmptyStates from '@/components/trips/TripEmptyStates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { prisma } from '@/lib/db';

function groupTripsByStatus(trips: Trip[]) {
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
  const defaultTab = ongoing.length > 0 ? 'ongoing' : upcoming.length > 0 ? 'upcoming' : 'past';

  return (
    <Container>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-6">
          <div>
            <h1 className="text-3xl font-bold">Your Trips</h1>
            <p className="text-muted-foreground mt-1">
              {trips.length > 0
                ? `Managing ${trips.length} ${trips.length === 1 ? 'trip' : 'trips'}`
                : 'Start planning your next adventure'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button asChild>
              <Link href="/trips/new/ai">
                <Plus className="h-4 w-4 mr-2" />
                Create Trip
              </Link>
            </Button>
          </div>
        </div>

        {/* Always show the Tabs section, remove the trips.length check */}
        {/* Stats Section */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Calendar className="h-4 w-4 text-primary" />
                Upcoming Trips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcoming.length}</div>
              <p className="text-xs text-muted-foreground">
                Next trip:{' '}
                {upcoming.length > 0
                  ? format(new Date(upcoming[0].startDate), 'MMM d, yyyy')
                  : 'None planned'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Plane className="h-4 w-4 text-primary" />
                Active Trips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ongoing.length}</div>
              <p className="text-xs text-muted-foreground">
                {ongoing.length > 0 ? 'Currently traveling' : 'No active trips'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Map className="h-4 w-4 text-primary" />
                Total Destinations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(trips.map(trip => trip.destination)).size}
              </div>
              <p className="text-xs text-muted-foreground">
                {trips.reduce((acc, trip) => acc + trip.activities.length, 0)} activities planned
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Trips Tabs */}
        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="ongoing" className="relative">
              Active
              {ongoing.length > 0 && (
                <span className="ml-2 -mr-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                  {ongoing.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="relative">
              Upcoming
              {upcoming.length > 0 && (
                <span className="ml-2 -mr-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                  {upcoming.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>

          {(['ongoing', 'upcoming', 'past'] as const).map(status => (
            <TabsContent key={status} value={status}>
              {(status === 'ongoing' ? ongoing : status === 'upcoming' ? upcoming : past).length >
              0 ? (
                <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                  {(status === 'ongoing' ? ongoing : status === 'upcoming' ? upcoming : past).map(
                    trip => (
                      <TripCard key={trip.id} trip={trip} />
                    )
                  )}
                </div>
              ) : (
                <TripEmptyStates type={status} />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Container>
  );
}
