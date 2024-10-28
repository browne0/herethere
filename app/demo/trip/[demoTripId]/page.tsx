'use client';
import { use, useCallback, useEffect, useState } from 'react';

import {
  CalendarDays,
  MapPin,
  ArrowLeft,
  ArrowRight,
  Lock,
  Clock,
  Route,
  Sparkles,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { ActivityCard } from '@/components/activities/ActivityCard';
import { TripHeader } from '@/components/trips/TripHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { DemoTrip } from '@/lib/types';
import { DemoTripStorage, getTripTimingText } from '@/lib/utils';

const generateActivities = async (trip: DemoTrip) => {
  const response = await fetch('/api/demo/generate-activities', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(trip),
  });

  if (!response.ok) {
    throw new Error('Failed to generate activities');
  }

  const data = await response.json();
  return data.activities;
};

export default function DemoTripPage({
  params: paramsPromise,
}: {
  params: Promise<{ demoTripId: string }>;
}) {
  const router = useRouter();
  const [trip, setTrip] = useState<DemoTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingActivities, setGeneratingActivities] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConversionDialog, setShowConversionDialog] = useState(false);

  const handleSignUpClick = useCallback(() => {
    setShowConversionDialog(true);
  }, []);

  const tripTiming = getTripTimingText(trip?.preferences.dates.from, trip?.preferences.dates.to);

  const params = use(paramsPromise);

  const loadTrip = useCallback(async () => {
    const demoTrip = DemoTripStorage.getDemoTrip(params.demoTripId);

    if (!demoTrip) {
      router.push('/');
      return;
    }

    setTrip(demoTrip);
    setLoading(false);

    // If trip doesn't have activities yet, generate them
    if (!demoTrip.activities) {
      setGeneratingActivities(true);
      try {
        const activities = await generateActivities(demoTrip);
        const updatedTrip = DemoTripStorage.updateDemoTrip(demoTrip.id, {
          activities,
        });
        if (updatedTrip) {
          setTrip(updatedTrip);
        }
      } catch (error) {
        console.error('Error generating activities:', error);
        setError('Failed to generate activities. Please try again.');
      } finally {
        setGeneratingActivities(false);
      }
    }
  }, [params.demoTripId, router]);

  useEffect(() => {
    loadTrip();
  }, [loadTrip]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!trip) return null;

  const ConversionDialog = () => (
    <Dialog open={showConversionDialog} onOpenChange={setShowConversionDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ready to see your full itinerary?</DialogTitle>
          <DialogDescription className="space-y-4">
            <p>Create an account to unlock the complete experience:</p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-primary" />
                <span>Complete personalized itinerary</span>
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-primary" />
                <span>Interactive map with all locations</span>
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-primary" />
                <span>Real-time activity adjustments</span>
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-primary" />
                <span>Detailed activity information</span>
              </li>
              <li className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-primary" />
                <span>Share and collaborate with travel companions</span>
              </li>
            </ul>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Button
            variant="outline"
            className="sm:flex-1"
            onClick={() => setShowConversionDialog(false)}
          >
            Maybe Later
          </Button>
          <Button className="sm:flex-1" asChild>
            <Link href="/sign-up">Create Free Account</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left Panel - Trip Details */}
      <div className="flex-1 min-w-0 overflow-y-auto pb-8">
        {loading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : !trip ? null : (
          <>
            {/* Header */}
            <TripHeader trip={trip} onSignUpClick={() => setShowConversionDialog(true)} />

            <div className="px-4 lg:px-8 space-y-6 mt-6">
              {/* Activities Section */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Trip Itinerary</CardTitle>
                  <Badge variant={tripTiming.variant}>{tripTiming.text}</Badge>
                </CardHeader>
                <CardContent>
                  {generatingActivities ? (
                    <div className="text-center py-12 bg-muted/20 rounded-lg">
                      <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">
                        Generating your personalized itinerary
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        We&apos;re creating the perfect itinerary based on your preferences
                      </p>
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
                    </div>
                  ) : error ? (
                    <div className="text-center py-12 bg-red-50 rounded-lg">
                      <h3 className="text-lg font-medium mb-2 text-red-600">
                        Oops! Something went wrong
                      </h3>
                      <p className="text-red-500 mb-4">{error}</p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setError(null);
                          loadTrip();
                        }}
                      >
                        Try Again
                      </Button>
                    </div>
                  ) : trip?.activities ? (
                    <div className="space-y-4">
                      {trip.activities.slice(0, 3).map(activity => (
                        <ActivityCard
                          key={activity.id}
                          activity={activity}
                          onSignUpClick={() => setShowConversionDialog(true)}
                        />
                      ))}

                      {/* "See More" card */}
                      <div
                        className="relative pl-6 border-l-2 border-gray-200 cursor-pointer"
                        onClick={() => setShowConversionDialog(true)}
                      >
                        <div className="absolute left-[-5px] top-3 w-2 h-2 rounded-full bg-primary" />
                        <div className="border rounded-lg p-6 hover:border-primary/50 transition-colors">
                          <div className="bg-muted/20 rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h3 className="font-semibold">Want to optimize this itinerary?</h3>
                                <p className="text-sm text-muted-foreground">
                                  Sign up to access our AI optimization features:
                                </p>
                              </div>
                              <Lock className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                              <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                                <Route className="w-8 h-8 text-indigo-600" />
                                <div>
                                  <p className="font-medium">Route Optimization</p>
                                  <p className="text-sm text-muted-foreground">
                                    Minimize travel time
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                                <Clock className="w-8 h-8 text-purple-600" />
                                <div>
                                  <p className="font-medium">Time Adjustments</p>
                                  <p className="text-sm text-muted-foreground">
                                    Perfect your schedule
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                                <Sparkles className="w-8 h-8 text-blue-600" />
                                <div>
                                  <p className="font-medium">Alternative Spots</p>
                                  <p className="text-sm text-muted-foreground">
                                    Discover hidden gems
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* Right Panel - Map Preview */}
      <div className="hidden lg:block w-[45%] border-l">
        <div className="h-full bg-muted/20 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Interactive Map</h3>
            <p className="text-sm text-muted-foreground mt-1">Available with full account</p>
            <Button onClick={() => setShowConversionDialog(true)} className="mt-4">
              Create Account
            </Button>
          </div>
        </div>
      </div>

      {/* Conversion Dialog */}
      <ConversionDialog />
    </div>
  );
}
