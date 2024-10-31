// components/trips/TripGenerationErrorClient.tsx
'use client';

import { useState } from 'react';

import { AlertTriangle, RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ErrorCode } from '@/lib/types';

interface TripGenerationErrorProps {
  tripId: string;
  error: {
    code: ErrorCode;
    message: string;
    details?: string;
    recoverable: boolean;
  };
}

export default function TripGenerationError({ tripId, error }: TripGenerationErrorProps) {
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const errorMessages = {
    OPENAI_ERROR: 'Our AI had trouble planning your trip',
    PLACES_ERROR: 'We had trouble finding some locations',
    DATABASE_ERROR: 'There was a problem saving your trip',
    TIMEOUT_ERROR: 'Trip generation took too long',
    INVALID_PREFERENCES: 'There was an issue with your preferences',
    UNKNOWN_ERROR: 'An unexpected error occurred',
  };

  const handleRetry = async () => {
    if (!error.recoverable) return;

    setIsRetrying(true);
    try {
      const response = await fetch(`/api/trips/${tripId}/regenerate`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to retry generation');
      }

      router.refresh();
    } catch (e) {
      console.error('Retry failed:', e);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete trip');
      }

      router.push('/trips');
    } catch (e) {
      console.error('Delete failed:', e);
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Card className="p-6">
        <div className="flex items-start space-x-4">
          <div className="bg-destructive/10 p-3 rounded-full">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-lg">Trip Generation Failed</h3>
            <Alert variant="destructive" className="bg-destructive/5">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{errorMessages[error.code]}</AlertTitle>
              <AlertDescription className="mt-2">
                {error.message}
                {error.details && (
                  <p className="text-sm mt-2 text-muted-foreground">{error.details}</p>
                )}
              </AlertDescription>
            </Alert>

            <div className="flex gap-4 mt-6">
              {error.recoverable && (
                <Button
                  variant="default"
                  onClick={handleRetry}
                  disabled={isRetrying || isDeleting}
                  className="flex-1"
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Try Again
                    </>
                  )}
                </Button>
              )}

              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={isRetrying || isDeleting}
                className="flex-1"
              >
                {isDeleting ? (
                  <>
                    <Trash2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Trip
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        {error.recoverable ? (
          <>
            Try generating your trip again, or delete it to start fresh.
            {error.code === 'TIMEOUT_ERROR' && (
              <p className="mt-1">
                Tip: Consider reducing the number of days or activities to speed up generation.
              </p>
            )}
          </>
        ) : (
          'We recommend starting fresh with a new trip.'
        )}
      </div>
    </div>
  );
}
