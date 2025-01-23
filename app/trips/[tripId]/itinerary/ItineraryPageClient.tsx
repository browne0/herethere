'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useActivitiesStore } from '@/lib/stores/activitiesStore';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Map, X } from 'lucide-react';
import AddActivityModal from '../components/AddActivityModal';
import DateEditModal from '../components/DateEditModal';
import TripCityModal from '../components/TripCityModal';
import TripEditModal from '../components/TripEditModal';
import TripHeader from '../components/TripHeader';
import TripTitleModal from '../components/TripTitleModal';
import type { ParsedItineraryActivity, ParsedTrip } from '../types';
import ItineraryMap from './components/ItineraryMap';
import { ItineraryView } from './components/ItineraryView';

interface ItineraryPageClientProps {
  initialTrip: ParsedTrip;
  initialActivities: ParsedItineraryActivity[];
}

export function ItineraryPageClient({ initialTrip, initialActivities }: ItineraryPageClientProps) {
  const { setTrip, trip } = useActivitiesStore();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
  const [hoveredActivityId, setHoveredActivityId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const router = useRouter();

  const MapComponent = (
    <ItineraryMap
      onMarkerHover={setHoveredActivityId}
      onMarkerSelect={setSelectedActivityId}
      selectedActivityId={selectedActivityId}
      hoveredActivityId={hoveredActivityId}
      initialTrip={initialTrip}
    />
  );

  const handleTripUpdate = (updatedTrip: ParsedTrip) => {
    // Update local store
    setTrip({ ...trip, ...updatedTrip });
    // Refresh the page data
    router.refresh();
  };

  // Initialize store with server-fetched data
  useEffect(() => {
    setTrip(initialTrip);
  }, [initialTrip, initialActivities, setTrip]);

  return (
    <div className="min-h-screen flex flex-col">
      <TripHeader
        onEditClick={() => setIsEditModalOpen(true)}
        onTitleClick={() => setIsTitleModalOpen(true)}
        onDateClick={() => setIsDateModalOpen(true)}
        onCityClick={() => setIsCityModalOpen(true)}
      />

      <div className="flex flex-col lg:flex-row pt-[65px] h-screen">
        {/* Itinerary view */}
        <div className="w-full lg:w-1/2 h-[calc(100vh-65px)] flex flex-col">
          <ItineraryView
            onMarkerHover={setHoveredActivityId}
            onMarkerSelect={setSelectedActivityId}
          />
        </div>

        {/* Desktop map view */}
        {isDesktop && (
          <div className="hidden lg:block w-1/2 h-[calc(100vh-65px)]">{MapComponent}</div>
        )}
      </div>

      {/* Mobile map button and sheet */}
      {!isDesktop && (
        <Sheet open={isMapOpen} onOpenChange={setIsMapOpen}>
          <SheetTitle>Map</SheetTitle>
          <SheetTrigger asChild>
            <Button
              className="fixed bottom-6 right-6 shadow-lg rounded-full w-14 h-14 p-0 z-50"
              size="icon"
            >
              <Map className="h-6 w-6" />
            </Button>
          </SheetTrigger>

          <SheetContent side="bottom" className="h-screen p-0">
            <SheetHeader className="absolute top-0 left-0 z-50 p-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full bg-white shadow-md hover:bg-gray-100"
                onClick={() => setIsMapOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </SheetHeader>
            {isMapOpen && MapComponent}
          </SheetContent>
        </Sheet>
      )}
      <TripEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdateTrip={handleTripUpdate}
      />
      <DateEditModal
        isOpen={isDateModalOpen}
        onClose={() => setIsDateModalOpen(false)}
        onUpdateTrip={handleTripUpdate}
      />
      <TripCityModal
        isOpen={isCityModalOpen}
        onClose={() => setIsCityModalOpen(false)}
        onUpdateTrip={handleTripUpdate}
      />
      <AddActivityModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      <TripTitleModal
        isOpen={isTitleModalOpen}
        onClose={() => setIsTitleModalOpen(false)}
        onUpdateTrip={handleTripUpdate}
      />
    </div>
  );
}
