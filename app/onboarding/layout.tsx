'use client';

import { ChevronLeft } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

import { Progress } from '@/components/ui/progress';

const STEPS = ['interests', 'pace', 'dietary', 'requirements', 'time', 'summary'] as const;

interface LayoutProps {
  children: React.ReactNode;
}

export default function OnboardingLayout({ children }: LayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentStep = pathname.split('/').pop() || '';

  // Calculate progress percentage
  const currentStepIndex = STEPS.indexOf(currentStep as (typeof STEPS)[number]);
  const progress = currentStepIndex >= 0 ? ((currentStepIndex + 1) / STEPS.length) * 100 : 0;

  // Only show back button if not on first step
  const showBackButton = currentStepIndex > 0;

  const handleBack = () => {
    if (currentStepIndex > 0) {
      const previousStep = STEPS[currentStepIndex - 1];
      router.push(`/onboarding/${previousStep}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex flex-col">
      <div className="w-full max-w-2xl mx-auto flex-1">
        {showBackButton && (
          <button
            onClick={handleBack}
            className="mb-4 flex items-center text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </button>
        )}
        <Progress value={progress} className="h-2 mb-6" />
        {children}
      </div>
    </div>
  );
}
