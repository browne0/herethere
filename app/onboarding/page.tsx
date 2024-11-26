'use client';

import { useEffect } from 'react';

import { redirect } from 'next/navigation';

import { usePreferences } from '@/lib/stores/preferences';

export default function OnboardingPage() {
  const { onboardingComplete } = usePreferences();

  useEffect(() => {
    // Redirect to interests page if onboarding isn't complete
    if (!onboardingComplete) {
      redirect('/onboarding/interests');
    } else {
      redirect('/dashboard');
    }
  }, [onboardingComplete]);

  return null; // Page will redirect
}
