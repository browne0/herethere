import { isActivityOpenDuring } from '../utils';

jest.mock('@/lib/db', () => ({
  getDatabaseUrl: () => 'postgresql://user:password@localhost:5432/test_db',
}));

describe('isActivityOpenDuring', () => {
  describe('Overnight Hours (Bar/Club)', () => {
    const overnightVenue = {
      openingHours: {
        periods: [
          {
            open: { day: 1, hour: 17, minute: 0 },
            close: { day: 2, hour: 2, minute: 0 },
          },
        ],
      },
    };

    it('should return true when activity starts before midnight and ends after', () => {
      const startTime = new Date('2024-03-18T23:00:00.000Z'); // Monday 11 PM
      expect(isActivityOpenDuring(overnightVenue, startTime)).toBe(true);
    });

    it('should return true when activity is entirely after midnight but before close', () => {
      const startTime = new Date('2024-03-19T00:30:00.000Z'); // Tuesday 12:30 AM
      expect(isActivityOpenDuring(overnightVenue, startTime)).toBe(true);
    });

    it('should return true when activity starts before closing time, even if it extends beyond', () => {
      const startTime = new Date('2024-03-19T01:30:00.000Z'); // Tuesday 1:30 AM
      expect(isActivityOpenDuring(overnightVenue, startTime)).toBe(true);
    });

    it('should return false when activity starts after closing time', () => {
      const startTime = new Date('2024-03-19T02:15:00.000Z'); // Tuesday 2:15 AM
      expect(isActivityOpenDuring(overnightVenue, startTime)).toBe(false);
    });
  });

  describe('Split Hours (Restaurant)', () => {
    const splitHoursVenue = {
      openingHours: {
        periods: [
          {
            open: { day: 1, hour: 11, minute: 30 },
            close: { day: 1, hour: 14, minute: 30 },
          },
          {
            open: { day: 1, hour: 17, minute: 0 },
            close: { day: 1, hour: 22, minute: 0 },
          },
        ],
      },
    };

    it('should return true during lunch period', () => {
      const startTime = new Date('2024-03-18T12:00:00.000Z'); // Monday 12 PM

      expect(isActivityOpenDuring(splitHoursVenue, startTime)).toBe(true);
    });

    it('should return false during afternoon break', () => {
      const startTime = new Date('2024-03-18T15:00:00.000Z'); // Monday 3 PM

      expect(isActivityOpenDuring(splitHoursVenue, startTime)).toBe(false);
    });

    it('should return true during dinner period', () => {
      const startTime = new Date('2024-03-18T18:00:00.000Z'); // Monday 6 PM

      expect(isActivityOpenDuring(splitHoursVenue, startTime)).toBe(true);
    });
  });

  describe('Missing/Invalid Data Handling', () => {
    it('should return false when periods array is empty', () => {
      const emptyPeriods = {
        openingHours: {
          periods: [],
        },
      };

      const startTime = new Date('2024-03-18T12:00:00.000Z');

      expect(isActivityOpenDuring(emptyPeriods, startTime)).toBe(false);
    });

    it('should return false when period has missing open/close data', () => {
      const invalidPeriod = {
        openingHours: {
          periods: [
            {
              open: { day: 1 }, // Missing hour and minute
              close: { day: 1, hour: 17, minute: 0 },
            },
          ],
        },
      };

      const startTime = new Date('2024-03-18T12:00:00.000Z');

      expect(isActivityOpenDuring(invalidPeriod, startTime)).toBe(false);
    });

    it('should handle 24/7 venues correctly', () => {
      const alwaysOpen = {
        openingHours: {
          periods: [
            {
              open: { day: 0, hour: 0, minute: 0 },
              // No close time indicates 24/7
            },
          ],
        },
      };

      const startTime = new Date('2024-03-18T03:00:00.000Z');

      expect(isActivityOpenDuring(alwaysOpen, startTime)).toBe(true);
    });
  });

  describe('isActivityOpenDuring - Additional Edge Cases', () => {
    describe('Boundary Cases', () => {
      const venue = {
        openingHours: {
          periods: [
            {
              open: { day: 1, hour: 9, minute: 0 },
              close: { day: 1, hour: 17, minute: 0 },
            },
          ],
        },
      };

      it('should return true when activity starts exactly at opening time', () => {
        const startTime = new Date('2024-03-18T09:00:00.000Z'); // Monday 9 AM

        expect(isActivityOpenDuring(venue, startTime)).toBe(true);
      });

      it('should return true when activity ends exactly at closing time', () => {
        const startTime = new Date('2024-03-18T15:00:00.000Z'); // Monday 3 PM

        expect(isActivityOpenDuring(venue, startTime)).toBe(true);
      });

      it('should return false when activity starts exactly at closing time', () => {
        const startTime = new Date('2024-03-18T17:00:00.000Z'); // Monday 5 PM

        expect(isActivityOpenDuring(venue, startTime)).toBe(false);
      });
    });

    describe('Different Days Same Pattern', () => {
      const weekdayVenue = {
        openingHours: {
          periods: [
            {
              open: { day: 1, hour: 9, minute: 0 },
              close: { day: 1, hour: 17, minute: 0 },
            },
            {
              open: { day: 2, hour: 9, minute: 0 },
              close: { day: 2, hour: 17, minute: 0 },
            },
            {
              open: { day: 3, hour: 9, minute: 0 },
              close: { day: 3, hour: 17, minute: 0 },
            },
          ],
        },
      };

      it('should work consistently across different weekdays', () => {
        // Monday
        const mondayStart = new Date('2024-03-18T10:00:00.000Z');
        expect(isActivityOpenDuring(weekdayVenue, mondayStart)).toBe(true);

        // Tuesday
        const tuesdayStart = new Date('2024-03-19T10:00:00.000Z');
        expect(isActivityOpenDuring(weekdayVenue, tuesdayStart)).toBe(true);

        // Wednesday
        const wednesdayStart = new Date('2024-03-20T10:00:00.000Z');
        expect(isActivityOpenDuring(weekdayVenue, wednesdayStart)).toBe(true);
      });

      it('should return false for days not in periods', () => {
        const sundayStart = new Date('2024-03-17T10:00:00.000Z');
        expect(isActivityOpenDuring(weekdayVenue, sundayStart)).toBe(false);
      });
    });
  });
});
