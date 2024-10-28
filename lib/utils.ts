import { clsx, type ClassValue } from 'clsx';
import { nanoid } from 'nanoid';
import { twMerge } from 'tailwind-merge';

import { City, DemoTrip, DemoTripPreferences, StoredDemoData } from '@/lib/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export class DemoTripStorage {
  static generateDemoTripId(): string {
    return nanoid(10);
  }

  static createDemoTrip(cityData: City, preferences: DemoTripPreferences): DemoTrip {
    return {
      id: this.generateDemoTripId(),
      cityData,
      preferences,
      createdAt: new Date().toISOString(),
    };
  }

  static storeDemoTrip(trip: DemoTrip): void {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const storageData: StoredDemoData = {
      trip,
      expiresAt: expiresAt.toISOString(),
    };

    localStorage.setItem(`wanderweave_demo_${trip.id}`, JSON.stringify(storageData));
  }

  static getDemoTrip(tripId: string): DemoTrip | null {
    try {
      const data = localStorage.getItem(`wanderweave_demo_${tripId}`);
      if (!data) return null;

      const storageData: StoredDemoData = JSON.parse(data);

      // Check if demo has expired
      if (new Date(storageData.expiresAt) < new Date()) {
        this.removeDemoTrip(tripId);
        return null;
      }

      return storageData.trip;
    } catch (error) {
      console.error('Error retrieving demo trip:', error);
      return null;
    }
  }

  static updateDemoTrip(tripId: string, updates: Partial<DemoTrip>): DemoTrip | null {
    const currentTrip = this.getDemoTrip(tripId);
    if (!currentTrip) return null;

    const updatedTrip = {
      ...currentTrip,
      ...updates,
    };

    this.storeDemoTrip(updatedTrip);
    return updatedTrip;
  }

  static removeDemoTrip(tripId: string): void {
    localStorage.removeItem(`wanderweave_demo_${tripId}`);
  }

  static cleanupExpiredDemos(): void {
    const now = new Date();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('wanderweave_demo_')) {
        try {
          const data: StoredDemoData = JSON.parse(localStorage.getItem(key) || '');
          if (new Date(data.expiresAt) < now) {
            localStorage.removeItem(key);
          }
        } catch (error) {
          localStorage.removeItem(key);
        }
      }
    }
  }
}
