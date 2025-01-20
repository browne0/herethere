import { ParsedTrip, TripPreferences } from '@/app/trips/[tripId]/types';
import { prisma } from '@/lib/db';
import { BudgetLevel } from '@/lib/types';
import { Prisma } from '@prisma/client';

interface GetTripOptions {
  userId: string;
  tripId: string;
  include?: string[];
}

interface DeleteTripOptions {
  userId: string;
  tripId: string;
}

interface UpdateTripOptions {
  userId: string;
  tripId: string;
  data: {
    startDate?: Date;
    endDate?: Date;
    cityId?: string;
    title?: string;
    preferences: TripPreferences;
  };
  include?: string[];
}

interface CreateTripOptions {
  userId: string;
  title: string;
  startDate: Date;
  endDate: Date;
  preferences: {
    budget: BudgetLevel;
    activities: string[];
  };
  city: Prisma.CityCreateInput;
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

    return trip as unknown as ParsedTrip;
  },

  async updateTrip({ userId, tripId, data, include = [] }: UpdateTripOptions) {
    // Verify trip ownership and get current city
    const existingTrip = await prisma.trip.findUnique({
      where: {
        id: tripId,
        userId,
      },
      select: {
        id: true,
        cityId: true,
        startDate: true,
        endDate: true,
        lastRebalanced: true,
      },
    });

    if (!existingTrip) {
      throw new Error('Trip not found');
    }

    // Validate dates if provided
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid date format');
      }

      if (start > end) {
        throw new Error('Start date must be before end date');
      }

      // Set end date to end of day (23:59:59.999)
      end.setHours(23, 59, 59, 999);
      data.endDate = end;
    }

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

    // Use a transaction if we're changing cities
    if (data.cityId && data.cityId !== existingTrip.cityId) {
      return await prisma.$transaction(async tx => {
        // First, delete all activities
        await tx.itineraryActivity.deleteMany({
          where: {
            tripId,
          },
        });

        // Then update the trip
        const updatedTrip = await tx.trip.update({
          where: {
            id: tripId,
          },
          data: {
            startDate: data.startDate,
            endDate: data.endDate,
            cityId: data.cityId,
            title: data.title,
            preferences: data.preferences as any,
            lastRebalanced: null,
          },
          include: includeQuery,
        });

        return updatedTrip;
      });
    }

    // If we're not changing cities, just update the trip
    const updatedTrip = await prisma.trip.update({
      where: {
        id: tripId,
      },
      data: {
        startDate: data.startDate,
        endDate: data.endDate,
        title: data.title,
        preferences: data.preferences as any,
        lastRebalanced:
          data.startDate !== existingTrip.startDate || data.endDate !== existingTrip.endDate
            ? null
            : existingTrip.lastRebalanced,
      },
      include: includeQuery,
    });

    return updatedTrip;
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
          city: true,
        },
      });

      return {
        tripId: deletedTrip.id,
        title: deletedTrip.title,
        city: deletedTrip.city.name,
        activitiesRemoved: deletedTrip._count.activities,
      };
    });
  },

  async createTrip({ userId, city: cityData, startDate, endDate, ...tripData }: CreateTripOptions) {
    // Create or update the city
    const city = await prisma.city.upsert({
      where: {
        name_countryCode: {
          name: cityData.name,
          countryCode: cityData.countryCode,
        },
      },
      create: {
        name: cityData.name,
        countryCode: cityData.countryCode,
        latitude: cityData.latitude,
        longitude: cityData.longitude,
        placeId: cityData.placeId,
        timezone: cityData.timezone,
      },
      update: {},
    });

    // Set end date to end of day
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Create the trip
    const trip = await prisma.trip.create({
      data: {
        ...tripData,
        city: {
          connect: {
            id: city.id,
          },
        },
        user: {
          connect: {
            id: userId,
          },
        },
        startDate: new Date(startDate),
        endDate: end,
      },
    });

    return trip;
  },
};
