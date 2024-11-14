'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';

import { useTripActivities } from '@/contexts/TripActivitiesContext';

import { DeleteTripButton } from './DeleteTripButton';
import { TripActionsDropdown } from './TripActionsDropdown';
import { TripShareDialog } from './TripShareDialog';
import { Button } from '../ui/button';

export function QuickActions() {
  const { trip, activities } = useTripActivities();

  return (
    <div className="flex flex-wrap justify-between items-center">
      <div className="flex flex-wrap gap-4 items-center">
        <Button asChild>
          <Link href={`/trips/${trip.id}/activities/new`}>
            <Plus className="h-4 w-4 mr-2" />
            Add Activity
          </Link>
        </Button>

        <TripShareDialog trip={trip} activityCount={activities.length} />
        <DeleteTripButton tripId={trip.id} />
      </div>

      <TripActionsDropdown trip={trip} />
    </div>
  );
}
