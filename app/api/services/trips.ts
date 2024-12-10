import { prisma } from '@/lib/db';

interface GetTripOptions {
  userId: string;
  tripId: string;
  include?: string[];
}

interface DeleteTripOptions {
  userId: string;
  tripId: string;
}

export const tripService = {
  async getTrip({ userId, tripId, include = [] }: GetTripOptions) {
    // Build include object for Prisma
    const includeQuery = include.reduce(
      (acc, field) => {
        if (field === 'activities') {
          acc[field] = {
            include: {
              recommendation: true,
            },
          };
        } else if (['user', 'city'].includes(field)) {
          acc[field] = true;
        }
        return acc;
      },
      {} as Record<string, unknown>
    );

    const trip = await prisma.trip.findUnique({
      where: {
        id: tripId,
        userId,
      },
      include: includeQuery,
    });

    if (!trip) {
      throw new Error('Trip not found');
    }

    return trip;
  },

  async deleteTrip({ userId, tripId }: DeleteTripOptions) {
    // Verify ownership first
    const trip = await prisma.trip.findUnique({
      where: {
        id: tripId,
        userId,
      },
      include: {
        _count: {
          select: {
            activities: true,
          },
        },
      },
    });

    if (!trip) {
      throw new Error('Trip not found');
    }

    // Use transaction for atomic deletion
    return await prisma.$transaction(async tx => {
      await tx.itineraryActivity.deleteMany({
        where: { tripId },
      });

      const deletedTrip = await tx.trip.delete({
        where: { id: tripId },
        include: {
          _count: {
            select: {
              activities: true,
            },
          },
        },
      });

      return {
        tripId: deletedTrip.id,
        destination: deletedTrip.title,
        activitiesRemoved: deletedTrip._count.activities,
      };
    });
  },
};
