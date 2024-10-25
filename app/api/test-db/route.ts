import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { UserPreferences } from '@/lib/types';

export async function GET() {
  try {
    const defaultPreferences: UserPreferences = {
      dietary: [],
      interests: [],
      budget: 'MEDIUM',
      travelStyle: [],
      accessibility: [],
      notifications: {
        email: true,
        push: true,
      },
    };

    // Try to create a test user
    const testUser = await prisma.user.upsert({
      where: { email: 'test@test.com' },
      create: {
        id: 'test-id',
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
        preferences: defaultPreferences,
      },
      update: {},
    });

    return NextResponse.json({ success: true, user: testUser });
  } catch (error) {
    console.error('Database test failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
