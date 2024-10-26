// app/trips/[tripId]/activities/[activityId]/edit/page.tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { ActivityForm } from '@/components/activities/ActivityForm';
import { Container } from '@/components/layouts/container';
import { prisma } from '@/lib/db';

interface EditActivityPageProps {
  params: {
    tripId: string;
    activityId: string;
  };
}

export default async function EditActivityPage({ params }: EditActivityPageProps) {
  const { userId } = await auth();
  const { tripId, activityId } = await params;

  if (!userId) {
    redirect('/sign-in');
  }

  // Fetch activity and verify it belongs to a trip owned by the user
  const activity = await prisma.activity.findFirst({
    where: {
      id: activityId,
      trip: {
        id: tripId,
        userId,
      },
    },
    include: {
      trip: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!activity) {
    redirect(`/trips/${tripId}`);
  }

  // Transform the activity data to match the form's expected shape
  const formData = {
    id: activity.id,
    name: activity.name,
    tripId: activity.tripId,
    type: activity.type as 'OTHER' | 'DINING' | 'SIGHTSEEING' | 'ACCOMMODATION' | 'TRANSPORTATION',
    address: activity.address,
    latitude: activity.latitude,
    longitude: activity.longitude,
    startTime: activity.startTime,
    endTime: activity.endTime,
    notes: activity.notes,
    createdAt: activity.createdAt,
    updatedAt: activity.updatedAt,
  };

  return (
    <Container size="md">
      <h1 className="text-4xl font-bold mb-8">Edit Activity</h1>
      <ActivityForm initialData={formData} tripId={tripId} />
    </Container>
  );
}
