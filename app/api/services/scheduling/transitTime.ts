import { protos } from '@googlemaps/places';
import { isSameDay } from 'date-fns';

import { GoogleMapsClient } from '@/lib/maps/client';

interface CachedTransitTime {
  origin: string;
  destination: string;
  date: string; // Store as ISO string for consistent date handling
  duration: number;
  timestamp: number;
}

interface BatchRequest {
  origins: protos.google.type.ILatLng[];
  destinations: protos.google.type.ILatLng[];
  departureTime: Date;
  resolve: (duration: number) => void;
  reject: (error: Error) => void;
}

class TransitTimeOptimizer {
  private static instance: TransitTimeOptimizer;
  private cache: Map<string, CachedTransitTime>;
  private batchQueue: BatchRequest[];
  private processingBatch: boolean;
  private CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private BATCH_SIZE = 10; // Maximum origins × destinations should not exceed 100
  private BATCH_WAIT = 500; // Wait time in ms to collect requests

  private constructor() {
    // Initialize core properties while keeping client initialization separate
    this.cache = new Map();
    this.batchQueue = [];
    this.processingBatch = false;
  }

  public static getInstance(): TransitTimeOptimizer {
    if (!TransitTimeOptimizer.instance) {
      TransitTimeOptimizer.instance = new TransitTimeOptimizer();
    }
    return TransitTimeOptimizer.instance;
  }

  private generateCacheKey(
    origin: protos.google.type.ILatLng,
    destination: protos.google.type.ILatLng,
    date: Date
  ): string {
    // Create a consistent cache key format for transit time lookups
    const dateString = date.toISOString().split('T')[0];
    return `${origin.latitude},${origin.longitude}|${destination.latitude},${destination.longitude}|${dateString}`;
  }

  private async processBatchQueue(): Promise<void> {
    if (this.processingBatch || this.batchQueue.length === 0) return;

    this.processingBatch = true;

    // Process a batch of requests together to optimize API usage
    const currentBatch = this.batchQueue.slice(0, this.BATCH_SIZE);
    this.batchQueue = this.batchQueue.slice(this.BATCH_SIZE);

    try {
      // Get the Google Maps client instance for this batch of requests
      const client = await GoogleMapsClient.getInstance();

      const response = await client.distancematrix({
        params: {
          origins: currentBatch[0].origins.map(o => `${o.latitude},${o.longitude}`),
          destinations: currentBatch[0].destinations.map(d => `${d.latitude},${d.longitude}`),
          departure_time: currentBatch[0].departureTime,
          key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        },
      });

      // Process API results and update cache
      for (let i = 0; i < currentBatch[0].origins.length; i++) {
        for (let j = 0; j < currentBatch[0].destinations.length; j++) {
          const element = response.data.rows[i].elements[j];

          if (element.status === 'OK') {
            const duration = Math.ceil(element.duration.value / 60); // Convert seconds to minutes
            const cacheKey = this.generateCacheKey(
              currentBatch[0].origins[i],
              currentBatch[0].destinations[j],
              currentBatch[0].departureTime
            );

            // Store the result in cache for future lookups
            this.cache.set(cacheKey, {
              origin: `${currentBatch[0].origins[i].latitude},${currentBatch[0].origins[i].longitude}`,
              destination: `${currentBatch[0].destinations[j].latitude},${currentBatch[0].destinations[j].longitude}`,
              date: currentBatch[0].departureTime.toISOString(),
              duration,
              timestamp: Date.now(),
            });

            currentBatch[0].resolve(duration);
          } else {
            currentBatch[0].reject(new Error(`Transit time calculation failed: ${element.status}`));
          }
        }
      }
    } catch (error) {
      // Ensure all requests in the batch are properly rejected on error
      currentBatch.forEach(request => {
        request.reject(error as Error);
      });
    } finally {
      this.processingBatch = false;

      // Process any remaining requests in the queue
      if (this.batchQueue.length > 0) {
        setTimeout(() => this.processBatchQueue(), this.BATCH_WAIT);
      }
    }
  }

  public async getTransitTime(
    origin: protos.google.type.ILatLng,
    destination: protos.google.type.ILatLng,
    departureTime: Date
  ): Promise<number> {
    const cacheKey = this.generateCacheKey(origin, destination, departureTime);
    const cachedResult = this.cache.get(cacheKey);

    // Return cached result if it's still valid
    if (
      cachedResult &&
      Date.now() - cachedResult.timestamp < this.CACHE_DURATION &&
      isSameDay(new Date(cachedResult.date), departureTime)
    ) {
      return cachedResult.duration;
    }

    // If no valid cache exists, queue a new request
    return new Promise((resolve, reject) => {
      this.batchQueue.push({
        origins: [origin],
        destinations: [destination],
        departureTime,
        resolve,
        reject,
      });

      // Start processing the queue if it's not already in progress
      if (!this.processingBatch) {
        setTimeout(() => this.processBatchQueue(), this.BATCH_WAIT);
      }
    });
  }

  public clearCache(): void {
    this.cache.clear();
  }
}

// Export a singleton instance for consistent state management
export const transitTimeOptimizer = TransitTimeOptimizer.getInstance();

// Public API function for getting transit times
export async function getTransitTime(
  origin: protos.google.type.ILatLng,
  destination: protos.google.type.ILatLng,
  departureTime: Date
): Promise<number> {
  try {
    return await transitTimeOptimizer.getTransitTime(origin, destination, departureTime);
  } catch (error) {
    console.error('Transit time calculation failed:', error);
    throw error; // Allow calling code to handle the error appropriately
  }
}
