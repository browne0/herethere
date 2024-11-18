// components/trips/MapSection.tsx
'use client';

import React from 'react';

import { TripMapView } from './TripMapView';

export function MapSection() {
  const [hoveredActivityId, setHoveredActivityId] = React.useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = React.useState<string | null>(null);

  return (
    <TripMapView
      onMarkerHover={setHoveredActivityId}
      onMarkerSelect={setSelectedActivityId}
      hoveredActivityId={hoveredActivityId}
      selectedActivityId={selectedActivityId}
    />
  );
}
