import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { ActivityForm } from '@/components/activities/ActivityForm';
import { Container } from '@/components/layouts/container';
import { prisma } from '@/lib/db';

interface NewActivityPageProps {
  params: Promise<{
    tripId: string;
  }>;
}

export default async function NewActivityPage({ params }: NewActivityPageProps) {
  const { userId } = await auth();
  const { tripId } = await params;

  if (!userId) {
    return null;
  }

  // Verify the trip exists and belongs to the user
  const trip = await prisma.trip.findUnique({
    where: {
      id: tripId,
      userId,
    },
  });

  if (!trip) {
    redirect('/trips');
  }

  return (
    <Container size="md">
      <h1 className="text-4xl font-bold mb-8">Add New Activity</h1>
      <ActivityForm tripId={tripId} />
    </Container>
  );
}
