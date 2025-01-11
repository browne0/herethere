'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useActivitiesStore } from '@/lib/stores/activitiesStore';

import type { ParsedTrip, ParsedItineraryActivity } from '../types';
import ItineraryMap from './components/ItineraryMap';
import { ItineraryView } from './components/ItineraryView';
import DateEditModal from '../components/DateEditModal';
import TripCityModal from '../components/TripCityModal';
import TripEditModal from '../components/TripEditModal';
import TripHeader from '../components/TripHeader';

interface ItineraryPageClientProps {
  initialTrip: ParsedTrip;
  initialActivities: ParsedItineraryActivity[];
}

export function ItineraryPageClient({ initialTrip, initialActivities }: ItineraryPageClientProps) {
  const { setTrip, trip } = useActivitiesStore();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
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
      <ItineraryView />
      <div className="mt-[65px] lg:w-1/2 h-[calc(100vh-65px)]">
        <ItineraryMap initialTrip={initialTrip} />
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
    </div>
  );
}
