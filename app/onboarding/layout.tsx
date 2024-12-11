'use client';

import { useEffect } from 'react';

import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { usePreferences } from '@/lib/stores/preferences';

const STEPS = [
  'interests',
  'pace',
  'dietary',
  'requirements',
  'crowd-preference',
  'summary',
] as const;

interface LayoutProps {
  children: React.ReactNode;
}

export default function OnboardingLayout({ children }: LayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentStep = pathname.split('/').pop() || '';
  const { interests, pacePreference, preferredStartTime, setAllPreferences, ...preferences } =
    usePreferences();

  // Load existing preferences when component mounts
  useEffect(() => {
    const loadExistingPreferences = async () => {
      try {
        const response = await fetch('/api/preferences');
        if (!response.ok) throw new Error('Failed to fetch preferences');

        const existingPreferences = await response.json();

        // Only set preferences if they exist and have some data
        if (existingPreferences && Object.keys(existingPreferences).length > 0) {
          setAllPreferences(existingPreferences);
        }
      } catch (error) {
        console.error('Error loading existing preferences:', error);
        // Silent fail as this is a background operation
      }
    };

    loadExistingPreferences();
  }, [setAllPreferences]);

  const currentStepIndex = STEPS.indexOf(currentStep as (typeof STEPS)[number]);
  const progress = currentStepIndex >= 0 ? ((currentStepIndex + 1) / STEPS.length) * 100 : 0;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;
  const nextStep = !isLastStep ? STEPS[currentStepIndex + 1] : undefined;

  const handleBack = () => {
    if (currentStepIndex > 0) {
      const previousStep = STEPS[currentStepIndex - 1];
      router.push(`/onboarding/${previousStep}`);
    }
  };

  const handleComplete = async () => {
    try {
      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interests,
          pricePreference: preferences.pricePreference,
          energyLevel: preferences.energyLevel,
          preferredStartTime,
          dietaryRestrictions: preferences.dietaryRestrictions,
          cuisinePreferences: preferences.cuisinePreferences,
          mealImportance: preferences.mealImportance,
          transportPreferences: preferences.transportPreferences,
          crowdPreference: preferences.crowdPreference,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      toast.success('Preferences saved successfully');
      router.push('/trips');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else if (nextStep) {
      router.push(`/onboarding/${nextStep}`);
    }
  };

  const isNextDisabled = () => {
    switch (currentStep) {
      case 'interests':
        return interests.length === 0;
      case 'pace':
        return !pacePreference;
      case 'crowd-preference':
        return !preferredStartTime;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex flex-col">
      <div className="w-full max-w-2xl mx-auto flex-1">
        <Progress value={progress} className="h-2 mb-6" />

        {children}

        <div className="mt-6 flex justify-between items-center">
          {!isFirstStep ? (
            <Button variant="outline" onClick={handleBack}>
              Back
            </Button>
          ) : (
            <div />
          )}
          <Button onClick={handleNext} disabled={isNextDisabled()}>
            {isLastStep ? 'Complete' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
