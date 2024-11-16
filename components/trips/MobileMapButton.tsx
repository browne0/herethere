'use client';

import { Map } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useMobileMap } from '@/contexts/MobileMapContext';

export function MobileMapButton() {
  const { openMap } = useMobileMap();

  return (
    <div className="fixed bottom-4 left-0 right-0 flex justify-center z-50 lg:hidden">
      <Button variant="default" size="lg" className="rounded-full shadow-lg" onClick={openMap}>
        <Map className="h-5 w-5 mr-2" />
        <span>Map</span>
      </Button>
    </div>
  );
}
