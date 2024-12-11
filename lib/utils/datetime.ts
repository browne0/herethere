type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

/**
 * Convert a time string to a TimeOfDay
 * @param time - Time string in 24-hour format (e.g., "14:30") or Date object
 */
export function getTimeOfDay(time?: string | Date): TimeOfDay {
  if (!time) return 'afternoon'; // Default to afternoon if no time provided

  let hours: number;

  if (time instanceof Date) {
    hours = time.getHours();
  } else {
    // Convert time string to hours
    hours = parseInt(time.split(':')[0]);
  }

  if (hours >= 5 && hours < 12) return 'morning';
  if (hours >= 12 && hours < 17) return 'afternoon';
  if (hours >= 17 && hours < 22) return 'evening';
  return 'night';
}

interface OpeningPeriod {
  open: { day: number; time: string };
  close: { day: number; time: string };
}

interface OpeningHours {
  periods: OpeningPeriod[];
  weekdayText?: string[];
}

/**
 * Check if a place is operating at a given time
 * @param openingHours - Google Places-style opening hours object
 * @param checkTime - Time to check (in 24-hour format, e.g., "14:30")
 */
export function isOperatingNow(openingHours?: OpeningHours | null, checkTime?: string): boolean {
  if (!openingHours?.periods || !checkTime) return true; // If no hours data, assume it's open

  const now = new Date();
  const currentDay = now.getDay();
  const [hours, minutes] = checkTime.split(':').map(Number);

  // Find the period for the current day
  const todayPeriod = openingHours.periods.find(period => period.open.day === currentDay);

  if (!todayPeriod) return false; // Closed on this day

  // Convert times to comparable numbers (e.g., "1430" for 14:30)
  const checkTimeNumber = hours * 100 + minutes;
  const openTimeNumber = parseInt(todayPeriod.open.time);
  const closeTimeNumber = parseInt(todayPeriod.close.time);

  // Handle normal case (open and close times on same day)
  if (closeTimeNumber > openTimeNumber) {
    return checkTimeNumber >= openTimeNumber && checkTimeNumber <= closeTimeNumber;
  }

  // Handle overnight case (e.g., opens at 18:00, closes at 02:00)
  return checkTimeNumber >= openTimeNumber || checkTimeNumber <= closeTimeNumber;
}

/**
 * Format a date range into a human-readable string
 */
export function formatDateRange(startDate: Date, endDate: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  };

  return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
}

/**
 * Check if a date is within operating season
 * Useful for seasonal activities
 */
export function isInSeason(
  date: Date,
  seasonStart?: { month: number; day: number },
  seasonEnd?: { month: number; day: number }
): boolean {
  if (!seasonStart || !seasonEnd) return true; // If no season data, assume it's always in season

  const currentMonth = date.getMonth() + 1; // getMonth() returns 0-11
  const currentDay = date.getDate();

  // Create comparable numbers (e.g., 305 for March 5th)
  const currentDate = currentMonth * 100 + currentDay;
  const startDate = seasonStart.month * 100 + seasonStart.day;
  const endDate = seasonEnd.month * 100 + seasonEnd.day;

  // Handle normal case (e.g., June to August)
  if (endDate > startDate) {
    return currentDate >= startDate && currentDate <= endDate;
  }

  // Handle cross-year case (e.g., November to March)
  return currentDate >= startDate || currentDate <= endDate;
}
