import { ComponentProps } from 'react';

import { clsx, type ClassValue } from 'clsx';
import { nanoid } from 'nanoid';
import { twMerge } from 'tailwind-merge';

import { Badge } from '@/components/ui/badge';
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
      activities: updates.activities || currentTrip.activities,
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
        } catch (_error) {
          localStorage.removeItem(key);
        }
      }
    }
  }
}

type BadgeVariant = ComponentProps<typeof Badge>['variant'];

export function getTripTimingText(
  startDate: Date | undefined,
  endDate: Date | undefined
): { text: string; variant: BadgeVariant } {
  if (!startDate || !endDate) {
    return { text: 'Preview', variant: 'secondary' };
  }
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffHours = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60));
  const diffDays = Math.ceil(diffHours / 24);

  if (now > end) {
    return { text: 'Past trip', variant: 'outline' };
  }

  if (now >= start && now <= end) {
    return { text: 'In progress', variant: 'secondary' };
  }

  if (diffHours <= 24) {
    if (diffHours <= 1) {
      return { text: 'Starting soon', variant: 'secondary' };
    }
    return { text: `In ${diffHours} hours`, variant: 'secondary' };
  }

  if (diffDays === 1) {
    return { text: 'Tomorrow', variant: 'secondary' };
  }

  return { text: `${diffDays} days away`, variant: 'secondary' };
}
