import { prisma } from '@/lib/db';
import { PreferencesState } from '@/lib/stores/preferences';

interface CuisinePreferences {
  preferred: string[];
  avoided: string[];
}

interface MealImportance {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

interface UserPreferences {
  interests: string[];
  pricePreference: number;
  energyLevel: number;
  preferredStartTime: string;
  dietaryRestrictions: string[];
  cuisinePreferences: CuisinePreferences;
  mealImportance: MealImportance;
  transportPreferences: string[];
  crowdPreference: string;
}

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
      pricePreference: preferences.pricePreference!,
      transportPreferences: preferences.transportPreferences!,
      dietaryRestrictions: preferences.dietaryRestrictions?.includes('none')
        ? []
        : preferences.dietaryRestrictions!,
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

    return user?.preferences || {};
  },
};
