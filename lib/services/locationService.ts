import { Location } from '../types';

export class LocationService {
  private static cache = new Map<string, Location>();

  static async searchLocation(_query: string): Promise<Location[]> {
    // Implementation for location search using Google Places API
    // Returns array of locations matching the query
    return [];
  }

  static async getLocationDetails(placeId: string): Promise<Location | null> {
    if (this.cache.has(placeId)) {
      return this.cache.get(placeId)!;
    }

    // Implementation for fetching detailed location info
    // Cache the result before returning
    return null;
  }

  static async calculateDistance(
    origin: Location,
    destination: Location,
    mode: google.maps.TravelMode = google.maps.TravelMode.DRIVING
  ): Promise<{
    distance: string;
    duration: string;
  }> {
    return new Promise((resolve, reject) => {
      const service = new google.maps.DistanceMatrixService();

      service.getDistanceMatrix(
        {
          origins: [{ lat: origin.latitude, lng: origin.longitude }],
          destinations: [{ lat: destination.latitude, lng: destination.longitude }],
          travelMode: mode,
        },
        (response, status) => {
          if (status === 'OK' && response) {
            const result = response.rows[0].elements[0];
            resolve({
              distance: result.distance.text,
              duration: result.duration.text,
            });
          } else {
            reject(new Error('Failed to calculate distance'));
          }
        }
      );
    });
  }
}
