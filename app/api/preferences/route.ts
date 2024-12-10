import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { preferencesService } from '@/app/api/services/preferences';
import { PreferencesState } from '@/lib/stores/preferences';

export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const preferences: Partial<PreferencesState> = await req.json();

    if (!preferences || Object.keys(preferences).length === 0) {
      return NextResponse.json({ error: 'No preferences provided' }, { status: 400 });
    }

    const updatedUser = await preferencesService.updatePreferences(userId, preferences);

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('[PREFERENCES_PUT]', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}

export async function GET(_req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const preferences = await preferencesService.getPreferences(userId);

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('[PREFERENCES_GET]', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}
