import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import ActivityDetails from '@/components/activities/ActivityDetails';
import { prisma } from '@/lib/db';

export default async function ActivityDetailsPage({
  params,
}: {
  params: { tripId: string; activityId: string };
}) {
  const { userId } = await auth();
  const { tripId, activityId } = await params;
  if (!userId) return null;

  const activity = await prisma.activity.findUnique({
    where: {
      id: activityId,
      trip: {
        userId: userId,
      },
    },
  });

  if (!activity) redirect('/trips');

  return <ActivityDetails activity={activity} tripId={tripId} />;
}
