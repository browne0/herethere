// components/trips/MapSection.tsx
'use client';

import React from 'react';

import { Accommodation } from '@/lib/trips';

import { TripMapView } from './TripMapView';

interface MapSectionProps {
  accommodation?: Accommodation;
}

export function MapSection({ accommodation }: MapSectionProps) {
  const [hoveredActivityId, setHoveredActivityId] = React.useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = React.useState<string | null>(null);

  return (
    <TripMapView
      onMarkerHover={setHoveredActivityId}
      onMarkerSelect={setSelectedActivityId}
      hoveredActivityId={hoveredActivityId}
      selectedActivityId={selectedActivityId}
      accommodation={accommodation}
    />
  );
}
