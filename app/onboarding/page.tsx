import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { prisma } from '@/lib/db';

export default async function OnboardingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Check onboarding status from the database
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { onboardingCompleted: true },
  });

  if (!user) {
    redirect('/sign-in');
  }

  // Redirect based on onboarding status
  if (!user.onboardingCompleted) {
    redirect('/onboarding/interests');
  } else {
    redirect('/trips');
  }
}
