// app/trips/[tripId]/components/ItineraryView/index.tsx
'use client';

import { useState } from 'react';

import { Map, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';

import { DailyRouteSummary } from './DailyRouteSummary';
import { TripMapView } from './TripMapView';
import { ParsedItineraryActivity, ParsedTrip } from '../../types';

interface ItineraryViewProps {
  activities: ParsedItineraryActivity[];
  trip: ParsedTrip;
}

export function ItineraryView({ trip }: ItineraryViewProps) {
  const [hoveredActivityId, setHoveredActivityId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);

  return (
    <div className="h-[calc(100vh-163px)]">
      {' '}
      {/* Updated height on parent */}
      {/* Split View Container */}
      <div className="h-full grid md:grid-cols-[1fr,1fr]">
        {' '}
        {/* Changed to h-full */}
        {/* Timeline Panel - Scrollable */}
        <div className="overflow-y-auto border-r bg-white">
          <div className="p-6">
            <DailyRouteSummary
              trip={trip}
              activities={trip.activities}
              onActivityHover={setHoveredActivityId}
              onActivitySelect={setSelectedActivityId}
              hoveredActivityId={hoveredActivityId}
              selectedActivityId={selectedActivityId}
            />
          </div>
        </div>
        {/* Map Panel - Fixed */}
        <div className="hidden md:block relative h-full">
          <TripMapView
            activities={trip.activities}
            onMarkerHover={setHoveredActivityId}
            onMarkerSelect={setSelectedActivityId}
            hoveredActivityId={hoveredActivityId}
            selectedActivityId={selectedActivityId}
            destination={{
              name: trip.destination,
              latitude: trip.preferences?.location?.latitude || 0,
              longitude: trip.preferences?.location?.longitude || 0,
            }}
          />
        </div>
      </div>
      {/* Mobile Map Button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10 md:hidden">
        <Button
          onClick={() => setIsMapOpen(true)}
          size="lg"
          className="shadow-lg flex items-center gap-2"
        >
          <Map className="w-5 h-5" />
          View Map
        </Button>
      </div>
      {/* Mobile Map Sheet */}
      <Sheet open={isMapOpen} onOpenChange={setIsMapOpen}>
        <SheetContent side="right" className="w-full p-0">
          <div className="h-full relative">
            <div className="absolute top-4 right-4 z-10">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsMapOpen(false)}
                className="bg-white shadow-lg h-10 w-10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <TripMapView
              activities={trip.activities}
              onMarkerHover={setHoveredActivityId}
              onMarkerSelect={id => {
                setSelectedActivityId(id);
                // Close map when activity is selected on mobile
                if (id) setIsMapOpen(false);
              }}
              hoveredActivityId={hoveredActivityId}
              selectedActivityId={selectedActivityId}
              destination={{
                name: trip.destination,
                latitude: trip.preferences?.location?.latitude || 0,
                longitude: trip.preferences?.location?.longitude || 0,
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
