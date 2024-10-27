'use client';

import { useRef } from 'react';

import { ArrowLeft, Map, X } from 'lucide-react';

import { TripMapView } from '@/components/trips/TripMapView';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';

export function MobileMapView({ tripId }: { tripId: string }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="lg:hidden">
          <Map className="h-4 w-4 mr-2" />
          View Map
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="p-0 w-full sm:w-[80vw]">
        <div className="h-full relative flex flex-col">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-white border-b px-4 py-3 flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => closeRef.current?.click()}
              className="mr-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Itinerary
            </Button>
            <SheetClose asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>
          <SheetClose ref={closeRef} className="hidden" />

          {/* Map with top padding to account for header */}
          <div className="flex-1 pt-[57px]">
            <TripMapView tripId={tripId} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
