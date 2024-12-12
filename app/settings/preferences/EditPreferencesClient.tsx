'use client';

import { useEffect } from 'react';

import { usePreferences, UserPreferences } from '@/lib/stores/preferences';

import EditPreferences from './EditPreferences';

interface EditPreferencesClientProps {
  initialPreferences: UserPreferences;
}

export default function EditPreferencesClient({ initialPreferences }: EditPreferencesClientProps) {
  const setAllPreferences = usePreferences(state => state.setAllPreferences);

  // Hydrate the Zustand store with initial data
  useEffect(() => {
    setAllPreferences(initialPreferences);
  }, [initialPreferences, setAllPreferences]);

  return <EditPreferences />;
}
