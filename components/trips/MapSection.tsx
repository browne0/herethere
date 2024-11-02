// components/trips/MapSection.tsx
'use client';

import React from 'react';

import { Activity } from '@prisma/client';

import { Accommodation } from '@/lib/trips';

import { TripMapView } from './TripMapView';

interface MapSectionProps {
  tripId: string;
  activities: Activity[];
  accommodation?: Accommodation;
}

export function MapSection({ tripId, activities, accommodation }: MapSectionProps) {
  const [hoveredActivityId, setHoveredActivityId] = React.useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = React.useState<string | null>(null);

  return (
    <TripMapView
      tripId={tripId}
      activities={activities}
      onMarkerHover={setHoveredActivityId}
      onMarkerSelect={setSelectedActivityId}
      hoveredActivityId={hoveredActivityId}
      selectedActivityId={selectedActivityId}
      accommodation={accommodation}
    />
  );
}
