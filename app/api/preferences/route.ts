import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { PreferencesState } from '@/lib/stores/preferences';

export async function PUT(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const preferences: Partial<PreferencesState> = await req.json();

    // Remove any function properties from the preferences object
    const preferencesData = {
      interests: preferences.interests || [],
      pricePreference: preferences.pricePreference || 2,
      energyLevel: preferences.energyLevel || 2,
      preferredStartTime: preferences.preferredStartTime || 'mid',
      dietaryRestrictions: preferences.dietaryRestrictions || [],
      cuisinePreferences: {
        preferred: preferences.cuisinePreferences?.preferred || [],
        avoided: preferences.cuisinePreferences?.avoided || [],
      },
      mealImportance: {
        breakfast: preferences.mealImportance?.breakfast || false,
        lunch: preferences.mealImportance?.lunch || false,
        dinner: preferences.mealImportance?.dinner || false,
      },
      transportPreferences: preferences.transportPreferences || [],
      bestTimeOfDay: preferences.bestTimeOfDay || [],
      prefersIndoor: preferences.prefersIndoor || [],
      prefersOutdoor: preferences.prefersOutdoor || [],
    };

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        preferences: preferencesData,
        onboardingCompleted: true, // Set to true when preferences are saved
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('[PREFERENCES_PUT]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function GET(_req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        preferences: true,
      },
    });

    return NextResponse.json(user?.preferences || {});
  } catch (error) {
    console.error('[PREFERENCES_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
