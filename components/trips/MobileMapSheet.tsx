'use client';

import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useMobileMap } from '@/contexts/MobileMapContext';
import { Accommodation } from '@/lib/trips';

import { MapSection } from './MapSection';

interface MobileMapSheetProps {
  accommodation?: Accommodation;
}

export function MobileMapSheet({ accommodation }: MobileMapSheetProps) {
  const { isMapOpen, closeMap } = useMobileMap();

  return (
    <div
      className={`fixed inset-0 z-50 bg-background transform transition-transform duration-300 lg:hidden
        ${isMapOpen ? 'translate-x-0' : 'translate-x-full'}`}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">Map View</h2>
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={closeMap}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1">
          <MapSection accommodation={accommodation} />
        </div>
      </div>
    </div>
  );
}
