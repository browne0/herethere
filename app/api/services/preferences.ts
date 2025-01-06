import { prisma } from '@/lib/db';
import { PreferencesState, UserPreferences } from '@/lib/stores/preferences';

export const preferencesService = {
  async updatePreferences(userId: string, preferences: Partial<PreferencesState>) {
    // First get existing preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    // Merge new preferences with existing ones
    const currentPreferences = (user?.preferences as Partial<UserPreferences>) || {};
    const updatedPreferences: UserPreferences = {
      ...currentPreferences,
      interests: preferences.interests!,
      crowdPreference: preferences.crowdPreference!,
      energyLevel: preferences.energyLevel!,
      preferredStartTime: preferences.preferredStartTime!,
      transportPreferences: preferences.transportPreferences!,
      dietaryRestrictions: preferences.dietaryRestrictions!,
      // Handle nested objects properly
      cuisinePreferences: preferences.cuisinePreferences
        ? {
            ...currentPreferences.cuisinePreferences,
            ...preferences.cuisinePreferences,
          }
        : currentPreferences.cuisinePreferences!,
      mealImportance: preferences.mealImportance
        ? {
            ...currentPreferences.mealImportance,
            ...preferences.mealImportance,
          }
        : currentPreferences.mealImportance!,
    };

    return await prisma.user.update({
      where: { id: userId },
      data: {
        preferences: updatedPreferences as any,
        onboardingCompleted: true,
        updatedAt: new Date(),
      },
    });
  },

  async getPreferences(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    const userPreferences = user?.preferences || {};

    return userPreferences as unknown as UserPreferences;
  },
};
