'use client';

import { Compass } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

interface ErrorPageProps {
  title: string;
  description: string;
  showBackButton?: boolean;
}

// Base component for error pages
export function ErrorPage({ title, description, showBackButton = true }: ErrorPageProps) {
  const router = useRouter();

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center space-y-6 px-4">
        <div className="flex justify-center">
          <Compass className="h-24 w-24 text-muted-foreground animate-pulse" />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
          <p className="text-lg text-muted-foreground">{description}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="default" onClick={() => router.push('/')} size="lg">
            Go Home
          </Button>
          {showBackButton && (
            <Button variant="outline" onClick={() => router.back()} size="lg">
              Go Back
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// 404 Page Component
export function NotFoundPage() {
  return (
    <ErrorPage
      title="Lost Your Way?"
      description="The page you're looking for doesn't exist or has been moved."
    />
  );
}

// Not Found Page Component
export function RouteNotFoundPage() {
  return (
    <ErrorPage
      title="Page Not Found"
      description="We couldn't find the content you're looking for. It might have been removed or is temporarily unavailable."
    />
  );
}
