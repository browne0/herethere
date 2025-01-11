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
