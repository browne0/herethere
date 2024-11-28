import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/db';
import { ViatorAPI, ViatorProduct } from '@/lib/viator';

import { ActivityDetail } from './ActivityDetail';

async function getViatorProducts(
  attractionName: string,
  destId: number,
  placeLocation?: { latitude: number; longitude: number }
): Promise<ViatorProduct[]> {
  const client = new ViatorAPI();

  try {
    const { products } = await client.searchProducts({
      destId: destId.toString(),
      sorting: {
        sort: 'TRAVELER_RATING',
        order: 'DESCENDING',
      },
      pagination: {
        start: 1,
        count: 10,
      },
    });

    // Filter for relevant products based on name and location
    return products.filter(product => {
      const titleMatch = product.title.toLowerCase().includes(attractionName.toLowerCase());
      const descMatch = product.description.toLowerCase().includes(attractionName.toLowerCase());

      // If we have coordinates, we could also filter by proximity
      // This would require the product location data from Viator

      return titleMatch || descMatch;
    });
  } catch (error) {
    console.error('Failed to fetch Viator products:', error);
    return [];
  }
}

export default async function ActivityPage({
  params,
}: {
  params: { tripId: string; activityId: string };
}) {
  const { userId } = await auth();
  const { activityId, tripId } = await params;

  if (!userId) redirect('/sign-in');

  // Get activity and its city
  const activity = await prisma.activityRecommendation.findUnique({
    where: { id: activityId },
    include: { city: true },
  });

  if (!activity) redirect(`/trips/${tripId}`);

  // Get Viator tours if city has destinationId
  const viatorProducts = activity.city.viatorDestId
    ? await getViatorProducts(activity.name, activity.city.viatorDestId)
    : [];

  const parsedActivity = {
    ...activity,
  };

  return <ActivityDetail activity={parsedActivity} viatorProducts={viatorProducts} />;
}
