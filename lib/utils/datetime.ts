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
