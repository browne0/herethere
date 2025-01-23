import { ParsedItineraryActivity } from '@/app/trips/[tripId]/types';
import { prisma } from '@/lib/db';
import { clearSchedulingData, scheduleActivities } from '../utils';

// Mock prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    itineraryActivity: {
      updateMany: jest.fn(),
    },
  },
}));

describe('Scheduling Utils', () => {
  const mockLocation = {
    latitude: 40.7128,
    longitude: -74.006,
    address: '123 Main St, New York, NY 10001',
    placeId: '123',
    neighborhood: 'Manhattan',
  };
  const mockOpeningHours = {
    periods: [
      {
        open: { day: 0, hour: 9, minute: 0 },
        close: { day: 0, hour: 17, minute: 0 },
      },
    ],
  };

  const createMockActivity = (
    id: string,
    duration: number,
    placeTypes: string[]
  ): ParsedItineraryActivity => ({
    id,
    tripId: 'trip1',
    recommendationId: `rec_${id}`,
    status: 'planned',
    startTime: null,
    endTime: null,
    transitTimeFromPrevious: 0,
    warning: null,
    recommendation: {
      id: `rec_${id}`,
      name: `Activity ${id}`,
      description: `Description for ${id}`,
      location: mockLocation,
      placeTypes,
      duration,
      rating: 4.5,
      reviewCount: 100,
      openingHours: mockOpeningHours,
      priceLevel: 'PRICE_LEVEL_EXPENSIVE',
      cityId: '',
      ratingTier: 'EXCEPTIONAL',
      reviewCountTier: 'HIGH',
      isMustSee: false,
      isTouristAttraction: false,
      indoorOutdoor: 'INDOOR',
      seasonalAvailability: 'ALL_YEAR',
      images: { urls: [] },
      availableDays: [],
      businessStatus: 'OPERATIONAL',
      primaryType: null,
      features: null,
      googlePlaceId: null,
      lastSyncedAt: new Date(),
      viatorProductId: null,
      viatorData: undefined,
      lastViatorSync: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      tiktokVideos: [],
      lastTikTokSync: null,
    },
    city: {
      name: 'New York',
      id: '1',
      createdAt: new Date(),
      updatedAt: new Date(),
      countryCode: 'US',
      placeId: '1',
      latitude: 40.7128,
      longitude: -74.006,
      lastViatorSync: null,
      viatorData: null,
      viatorDestId: null,
      viatorLookupId: null,
      timezone: 'America/New_York',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  describe('scheduleActivities', () => {
    it('should schedule activities within their opening hours', () => {
      const activities = [
        createMockActivity('1', 120, ['museum']),
        createMockActivity('2', 90, ['park']),
      ];

      const startDate = new Date('2024-03-20T00:00:00Z');
      const endDate = new Date('2024-03-20T23:59:59Z');
      const timezone = 'America/New_York';

      const scheduled = scheduleActivities(activities, startDate, endDate, timezone);

      expect(scheduled).toHaveLength(2);
      scheduled.forEach(activity => {
        if (activity.startTime && activity.endTime) {
          // Check if activity starts after 9 AM and ends before 5 PM
          expect(activity.startTime.getHours()).toBeGreaterThanOrEqual(9);
          expect(activity.endTime.getHours()).toBeLessThanOrEqual(17);
        }
      });
    });

    it('should schedule restaurants at appropriate meal times', () => {
      const activities = [
        createMockActivity('1', 60, ['restaurant']),
        createMockActivity('2', 60, ['restaurant']),
      ];

      const startDate = new Date('2024-03-20T00:00:00Z');
      const endDate = new Date('2024-03-20T23:59:59Z');
      const timezone = 'America/New_York';

      const scheduled = scheduleActivities(activities, startDate, endDate, timezone);

      scheduled.forEach(activity => {
        if (activity.startTime) {
          const hour = activity.startTime.getHours();
          // Check if scheduled during typical meal times
          expect(
            (hour >= 8 && hour <= 11) || // breakfast
              (hour >= 11 && hour <= 16) || // lunch
              (hour >= 17 && hour <= 22) // dinner
          ).toBeTruthy();
        }
      });
    });
  });

  describe('clearSchedulingData', () => {
    it('should clear scheduling data for all planned activities', async () => {
      await clearSchedulingData('trip1');

      expect(prisma.itineraryActivity.updateMany).toHaveBeenCalledWith({
        where: {
          tripId: 'trip1',
          status: 'planned',
        },
        data: {
          startTime: null,
          endTime: null,
          transitTimeFromPrevious: 0,
          warning: null,
        },
      });
    });
  });
});
