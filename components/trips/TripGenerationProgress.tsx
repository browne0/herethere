import { Clock, MapPin, Route } from 'lucide-react';

import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Progress } from '../ui/progress';

export function TripGenerationProgress({ progress, status }: { progress: number; status: string }) {
  const statusMessages = {
    generating: {
      title: 'Creating your perfect trip...',
      description: 'Our AI is crafting your personalized itinerary',
    },
    basic_ready: {
      title: 'Enhancing your activities...',
      description: 'Finding the perfect places and adding details',
    },
    complete: {
      title: 'Your trip is ready!',
      description: 'Get ready to explore',
    },
    error: {
      title: 'Something went wrong',
      description: 'Please try regenerating your trip',
    },
  };

  const currentStatus =
    statusMessages[status as keyof typeof statusMessages] || statusMessages.generating;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-semibold">{currentStatus.title}</h3>
          <p className="text-muted-foreground">{currentStatus.description}</p>
        </div>

        <div className="space-y-2">
          <Progress value={progress} className="w-full h-2" />
          <p className="text-sm text-muted-foreground text-center">{progress}% complete</p>
        </div>

        {status === 'error' && (
          <Button variant="destructive" className="mx-auto">
            Regenerate Trip
          </Button>
        )}

        <div className="grid grid-cols-3 gap-4 mt-8">
          <Card>
            <CardHeader className="p-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-medium">Planning</p>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div
                className={`h-2 rounded-full ${progress >= 30 ? 'bg-green-500' : 'bg-gray-200'}`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-medium">Details</p>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div
                className={`h-2 rounded-full ${progress >= 70 ? 'bg-green-500' : 'bg-gray-200'}`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4">
              <div className="flex items-center gap-2">
                <Route className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-medium">Places</p>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div
                className={`h-2 rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-gray-200'}`}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
