'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface MobileMapContextType {
  isMapOpen: boolean;
  openMap: () => void;
  closeMap: () => void;
}

const MobileMapContext = createContext<MobileMapContextType | undefined>(undefined);

export function MobileMapProvider({ children }: { children: ReactNode }) {
  const [isMapOpen, setIsMapOpen] = useState(false);

  const openMap = () => setIsMapOpen(true);
  const closeMap = () => setIsMapOpen(false);

  return (
    <MobileMapContext.Provider value={{ isMapOpen, openMap, closeMap }}>
      {children}
    </MobileMapContext.Provider>
  );
}

export function useMobileMap() {
  const context = useContext(MobileMapContext);
  if (!context) {
    throw new Error('useMobileMap must be used within a MobileMapProvider');
  }
  return context;
}
