import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/db';

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
    },
  });

  if (!user) {
    redirect('/sign-in');
  }

  // Parse the preferences from the database
  const initialPreferences = {
    interests: user.preferences!.interests,
    pricePreference: user.preferences!.pricePreference,
    pacePreference: user.preferences!.pacePreference,
    energyLevel: user.preferences!.energyLevel,
    preferredStartTime: user.preferences!.preferredStartTime,
    dietaryRestrictions: user.preferences!.dietaryRestrictions,
    cuisinePreferences: user.preferences!.cuisinePreferences,
    mealImportance: user.preferences!.mealImportance,
    transportPreferences: user.preferences!.transportPreferences,
    crowdPreference: user.preferences!.crowdPreference,
  };

  return <EditPreferencesClient initialPreferences={initialPreferences} />;
}
