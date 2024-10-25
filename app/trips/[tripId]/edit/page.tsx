// app/trips/[tripId]/edit/page.tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { Container } from '@/components/layouts/container';
import { TripForm } from '@/components/trips/TripForm';
import { prisma } from '@/lib/db';

interface EditTripPageProps {
  params: {
    tripId: string;
  };
}

export default async function EditTripPage({ params }: EditTripPageProps) {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  const trip = await prisma.trip.findUnique({
    where: {
      id: params.tripId,
      userId,
    },
  });

  if (!trip) {
    redirect('/trips');
  }

  return (
    <Container size="md">
      <h1 className="text-4xl font-bold mb-8">Edit Trip</h1>
      <TripForm initialData={trip} />
    </Container>
  );
}
