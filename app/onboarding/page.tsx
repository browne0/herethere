'use client';

import { useEffect } from 'react';

import { redirect } from 'next/navigation';

import { usePreferences } from '@/lib/stores/preferences';

export default function OnboardingPage() {
  const { onboardingCompleted } = usePreferences();

  useEffect(() => {
    // Redirect to interests page if onboarding isn't complete
    if (!onboardingCompleted) {
      redirect('/onboarding/interests');
    } else {
      redirect('/trips');
    }
  }, [onboardingCompleted]);

  return null; // Page will redirect
}
