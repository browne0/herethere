// app/demo/trip/preferences/page.tsx
'use client';
import React, { useEffect, useState } from 'react';

import { useSearchParams, useRouter } from 'next/navigation';

import { TripPreferencesForm } from '@/components/landing/TripPreferencesForm';
import type { City, DemoTripPreferences } from '@/lib/types';
import { DemoTripStorage } from '@/lib/utils';

export default function TripPreferencesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [cityData, setCityData] = useState<City | null>(null);

  useEffect(() => {
    const cityParam = searchParams.get('city');
    if (!cityParam) {
      router.push('/');
      return;
    }

    try {
      const decoded = JSON.parse(decodeURIComponent(cityParam)) as City;
      setCityData(decoded);
    } catch (error) {
      console.error('Error parsing city data:', error);
      router.push('/');
    }
  }, [searchParams, router]);

  const handlePreferencesSubmit = (preferences: DemoTripPreferences) => {
    if (!cityData || !preferences.dates?.from || !preferences.dates?.to) return;

    // Convert TripPreferences to DemoTripPreferences
    const demoPreferences: DemoTripPreferences = {
      ...preferences,
      dates: preferences.dates,
    };

    // Create and store the demo trip
    const demoTrip = DemoTripStorage.createDemoTrip(cityData, demoPreferences);
    DemoTripStorage.storeDemoTrip(demoTrip);

    // Navigate to the demo trip page
    router.push(`/demo/trip/${demoTrip.id}`);
  };

  if (!cityData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return <TripPreferencesForm city={cityData.name} onSubmit={handlePreferencesSubmit} />;
}
