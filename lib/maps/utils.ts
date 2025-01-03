import { protos } from '@googlemaps/places';

import { Location } from '@/app/trips/[tripId]/types';

/**
 * Validates a Google Place ID format
 * Place IDs begin with "ChI" and contain a mix of alphanumeric characters
 */
function isValidPlaceId(placeId: string): boolean {
  return /^ChI[a-zA-Z0-9_-]{27}$/.test(placeId);
}

/**
 * Creates a Google Maps directions URL with proper validation and encoding
 */
export function getGoogleMapsDirectionsUrl(destination: Location, origin?: Location): string {
  // Handle destination parameter
  let destinationParam: string;
  if (destination.placeId) {
    if (!isValidPlaceId(destination.placeId)) {
      // Fallback to coordinates if Place ID is invalid
      destinationParam = `${destination.latitude},${destination.longitude}`;
    } else {
      destinationParam = `place_id:${destination.placeId}`;
    }
  } else {
    destinationParam = `${destination.latitude},${destination.longitude}`;
  }

  // Handle origin parameter
  let originParam: string;
  if (origin) {
    if (origin.placeId && isValidPlaceId(origin.placeId)) {
      originParam = `place_id:${origin.placeId}`;
    } else {
      originParam = `${origin.latitude},${origin.longitude}`;
    }
  } else {
    originParam = 'current+location';
  }

  // Ensure parameters are properly encoded
  destinationParam = encodeURIComponent(destinationParam);
  originParam = encodeURIComponent(originParam);

  return `https://www.google.com/maps/dir/?api=1&destination=${destinationParam}&origin=${originParam}`;
}

export function isOpenAtTime(
  openingHours: protos.google.maps.places.v1.Place.IOpeningHours,
  dateTime: Date
): boolean {
  // If no opening hours data provided, conservatively return false
  if (!openingHours?.periods) return false;

  const day = dateTime.getDay();
  const hour = dateTime.getHours();
  const minute = dateTime.getMinutes();
  const timeInMinutes = hour * 60 + minute;

  // Check each period to see if the location is open
  return openingHours.periods.some(
    (period: protos.google.maps.places.v1.Place.OpeningHours.IPeriod) => {
      const open = period.open;
      const close = period.close;

      // Safety check for required fields
      if (
        !open ||
        typeof open.day !== 'number' ||
        typeof open.hour !== 'number' ||
        typeof open.minute !== 'number'
      ) {
        return false;
      }

      // For 24/7 places (always open)
      if (open.day === 0 && open.hour === 0 && open.minute === 0 && !close) {
        return true;
      }

      // Handle regular opening hours
      if (
        close &&
        typeof close.day === 'number' &&
        typeof close.hour === 'number' &&
        typeof close.minute === 'number'
      ) {
        const openTimeInMinutes = open.hour * 60 + open.minute;
        const closeTimeInMinutes = close.hour * 60 + close.minute;

        // Same day period
        if (open.day === close.day && open.day === day) {
          return timeInMinutes >= openTimeInMinutes && timeInMinutes <= closeTimeInMinutes;
        }

        // Overnight period (e.g., 11 PM - 3 AM)
        if (open.day !== close.day) {
          // If we're on the opening day, check if we're after opening time
          if (day === open.day) {
            return timeInMinutes >= openTimeInMinutes;
          }
          // If we're on the closing day, check if we're before closing time
          if (day === close.day) {
            return timeInMinutes <= closeTimeInMinutes;
          }
        }
      }

      return false;
    }
  );
}
