import {
  Client,
  OpeningHours,
  OpeningPeriod,
  TravelMode,
} from '@googlemaps/google-maps-services-js';

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

export class GoogleMapsClient {
  private static instance: Client;
  private static initializationPromise: Promise<void> | null = null;

  private constructor() {
    // Private constructor to prevent direct construction calls with 'new'
  }

  public static async getInstance(): Promise<Client> {
    // If we don't have an instance yet, create one
    if (!this.instance) {
      // If we're not already initializing, start initialization
      if (!this.initializationPromise) {
        this.initializationPromise = new Promise<void>(resolve => {
          this.instance = new Client();
          resolve();
        });
      }
      // Wait for initialization to complete
      await this.initializationPromise;
    }
    return this.instance;
  }
}

export async function getTransitTime(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  departureTime: Date
) {
  const client = await GoogleMapsClient.getInstance();

  try {
    const response = await client.distancematrix({
      params: {
        origins: [`${origin.lat},${origin.lng}`],
        destinations: [`${destination.lat},${destination.lng}`],
        mode: TravelMode.transit,
        departure_time: departureTime,
        key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      },
    });

    const duration = response.data.rows[0].elements[0].duration.value;
    return Math.ceil(duration / 60); // Convert seconds to minutes
  } catch (error) {
    console.error('Transit time calculation failed:', error);
    return 30; // Fallback to 30 min buffer
  }
}

export function isOpenAtTime(openingHours: OpeningHours, dateTime: Date): boolean {
  // If no opening hours data provided, conservatively return false
  if (!openingHours?.periods) return false;

  const day = dateTime.getDay();
  const time = dateTime.getHours() * 100 + dateTime.getMinutes();

  // Check each period to see if the location is open
  return openingHours.periods.some((period: OpeningPeriod) => {
    // For 24/7 places (always open)
    if (period.open.day === 0 && period.open.time === '0000' && !period.close) {
      return true;
    }

    // Handle regular opening hours
    if (period.open && period.close) {
      const openDay = period.open.day;
      const closeDay = period.close.day;
      const openTime = parseInt(period.open.time || '0000');
      const closeTime = parseInt(period.close.time || '2359');

      // Same day period
      if (openDay === closeDay && openDay === day) {
        return time >= openTime && time <= closeTime;
      }

      // Overnight period (e.g., 2200-0300)
      if (openDay !== closeDay) {
        if (day === openDay) {
          return time >= openTime;
        }
        if (day === closeDay) {
          return time <= closeTime;
        }
      }
    }

    return false;
  });
}
