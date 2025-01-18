'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useActivitiesStore } from '@/lib/stores/activitiesStore';

import AddActivityModal from '../components/AddActivityModal';
import DateEditModal from '../components/DateEditModal';
import TripCityModal from '../components/TripCityModal';
import TripEditModal from '../components/TripEditModal';
import TripHeader from '../components/TripHeader';
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
  const [hoveredActivityId, setHoveredActivityId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const router = useRouter();

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
    <div className="flex h-screen">
      <TripHeader
        onEditClick={() => setIsEditModalOpen(true)}
        onDateClick={() => setIsDateModalOpen(true)}
        onCityClick={() => setIsCityModalOpen(true)}
      />
      <ItineraryView onMarkerHover={setHoveredActivityId} onMarkerSelect={setSelectedActivityId} />
      <div className="mt-[65px] lg:w-1/2 h-[calc(100vh-65px)]">
        <ItineraryMap
          onMarkerHover={setHoveredActivityId}
          onMarkerSelect={setSelectedActivityId}
          selectedActivityId={selectedActivityId}
          hoveredActivityId={hoveredActivityId}
          initialTrip={initialTrip}
        />
      </div>
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
    </div>
  );
}
