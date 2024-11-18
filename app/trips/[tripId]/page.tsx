import { Suspense } from 'react';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { MapSection } from '@/components/trips/MapSection';
import { MobileMapButton } from '@/components/trips/MobileMapButton';
import { MobileMapSheet } from '@/components/trips/MobileMapSheet';
import { TripContent } from '@/components/trips/TripContent';
import { TripHeader } from '@/components/trips/TripHeader';
import { MobileMapProvider } from '@/contexts/MobileMapContext';
import { TripActivitiesProvider } from '@/contexts/TripActivitiesContext';
import { prisma } from '@/lib/db';

function MapLoadingFallback() {
  return (
    <div className="h-full flex items-center justify-center bg-muted/20">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    </div>
  );
}

export default async function TripDetailsPage({ params }: { params: { tripId: string } }) {
  const { userId } = await auth();
  const { tripId } = await params;
  if (!userId) {
    redirect('/sign-in');
  }

  const initialTripData = await prisma.trip.findUnique({
    where: {
      id: tripId,
      userId,
    },
    include: {
      activities: {
        orderBy: {
          startTime: 'asc',
        },
      },
    },
  });

  if (!initialTripData) {
    redirect('/trips');
  }

  return (
    <TripActivitiesProvider trip={initialTripData}>
      <MobileMapProvider>
        <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden">
          {/* Left Panel - Trip Details */}
          <div className="w-full lg:w-1/2 overflow-y-auto">
            <TripHeader />
            <TripContent />
          </div>

          {/* Right Panel - Map */}
          <div className="hidden lg:block w-full lg:w-1/2 border-l h-[300px] lg:h-auto">
            <Suspense fallback={<MapLoadingFallback />}>
              <MapSection />
            </Suspense>
          </div>

          <MobileMapButton />
          <MobileMapSheet />
        </div>
      </MobileMapProvider>
    </TripActivitiesProvider>
  );
}
