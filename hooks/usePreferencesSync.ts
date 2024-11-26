import { useEffect } from 'react';

import { usePreferences } from '@/lib/stores/preferences';

export function usePreferencesSync() {
  const preferences = usePreferences();

  // Load initial preferences
  useEffect(() => {
    async function loadPreferences() {
      try {
        const response = await fetch('/api/preferences');
        if (response.ok) {
          const data = await response.json();
          // Update Zustand store with saved preferences
          Object.entries(data).forEach(([key, value]) => {
            const setter =
              `set${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof preferences;
            if (typeof preferences[setter] === 'function') {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
              (preferences[setter] as Function)(value);
            }
          });
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    }

    loadPreferences();
  }, [preferences]);

  // Save preferences
  const savePreferences = async () => {
    try {
      const preferencesToSave = {
        interests: preferences.interests,
        pricePreference: preferences.pricePreference,
        energyLevel: preferences.energyLevel,
        preferredStartTime: preferences.preferredStartTime,
        dietaryRestrictions: preferences.dietaryRestrictions,
        cuisinePreferences: preferences.cuisinePreferences,
        mealImportance: preferences.mealImportance,
        transportPreferences: preferences.transportPreferences,
        bestTimeOfDay: preferences.bestTimeOfDay,
        prefersIndoor: preferences.prefersIndoor,
        prefersOutdoor: preferences.prefersOutdoor,
      };

      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferencesToSave),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      throw error;
    }
  };

  return { savePreferences };
}
