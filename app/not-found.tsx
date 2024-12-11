'use client';
import { Compass } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center space-y-6 px-4">
        <div className="flex justify-center">
          <Compass className="h-24 w-24 text-muted-foreground animate-pulse" />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Lost Your Way?</h1>
          <p className="text-lg text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="default" onClick={() => router.push('/')} size="lg">
            Go Home
          </Button>
          <Button variant="outline" onClick={() => router.back()} size="lg">
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
