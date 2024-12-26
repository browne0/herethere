import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/db';
import { UserPreferences } from '@/lib/stores/preferences';

import EditPreferencesClient from './EditPreferencesClient';

export default async function PreferencesPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Fetch user preferences
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      preferences: true,
      onboardingCompleted: true,
    },
  });

  if (!user?.onboardingCompleted) {
    redirect('/onboarding/interests');
  }

  // Ensure preferences exist and have the correct shape
  if (!user.preferences || typeof user.preferences !== 'object') {
    throw new Error('User preferences not properly initialized');
  }

  // Type assert the preferences as UserPreferences
  const preferences = user.preferences as unknown as UserPreferences;

  // Create the initial preferences object with type safety
  const initialPreferences: UserPreferences = {
    interests: preferences.interests,
    energyLevel: preferences.energyLevel,
    preferredStartTime: preferences.preferredStartTime,
    dietaryRestrictions: preferences.dietaryRestrictions,
    cuisinePreferences: preferences.cuisinePreferences,
    mealImportance: preferences.mealImportance,
    transportPreferences: preferences.transportPreferences,
    crowdPreference: preferences.crowdPreference,
  };

  return <EditPreferencesClient initialPreferences={initialPreferences} />;
}
