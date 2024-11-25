'use client';
import React, { createContext, useContext } from 'react';

import { Libraries, useLoadScript } from '@react-google-maps/api';

// These are the libraries we'll need based on the project documentation
const libraries: Libraries = ['places', 'marker'];

interface GoogleMapsContextType {
  isLoaded: boolean;
  loadError: Error | undefined;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  loadError: undefined,
});

export const useGoogleMapsStatus = () => useContext(GoogleMapsContext);

export const GoogleMapsProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { isLoaded, loadError } = useLoadScript({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  });

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  );
};
