import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { TripPrintView } from '@/components/trips/TripPrintView';
import { prisma } from '@/lib/db';

export default async function TripPrintPage({ params }: { params: { tripId: string } }) {
  const { userId } = await auth();
  const { tripId } = await params;
  if (!userId) {
    redirect('/sign-in');
  }

  const trip = await prisma.trip.findUnique({
    where: {
      id: tripId,
      userId,
    },
    include: {
      activities: true,
    },
  });

  if (!trip) {
    redirect('/trips');
  }

  return <TripPrintView trip={trip} />;
}
