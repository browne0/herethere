import { Calendar, Map, Plane, Plus, LucideIcon } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
}

const EmptyState = ({ icon: Icon, title, description, actionLabel }: EmptyStateProps) => (
  <Card className="border-dashed">
    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-primary/10 p-4 mb-4">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">{description}</p>
      <Button asChild>
        <Link href="/trips/new">
          <Plus className="h-4 w-4 mr-2" />
          {actionLabel}
        </Link>
      </Button>
    </CardContent>
  </Card>
);

type TripStateType = 'ongoing' | 'upcoming' | 'past';

interface TripEmptyStatesProps {
  type: TripStateType;
}

interface EmptyStateContent {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
}

type EmptyStateContentMap = Record<TripStateType, EmptyStateContent>;

const TripEmptyStates = ({ type }: TripEmptyStatesProps) => {
  const emptyStateContent: EmptyStateContentMap = {
    ongoing: {
      icon: Plane,
      title: 'No Active Trips',
      description: "You're not currently on any adventures. Ready to start your next journey?",
      actionLabel: 'Plan Your Next Trip',
    },
    upcoming: {
      icon: Calendar,
      title: 'No Upcoming Trips',
      description: "Nothing planned yet? Let's start organizing your next adventure!",
      actionLabel: 'Create New Trip',
    },
    past: {
      icon: Map,
      title: 'No Past Trips',
      description:
        'Your travel history is waiting to be written. Start by planning your first trip!',
      actionLabel: 'Start Your Journey',
    },
  };

  const content = emptyStateContent[type];

  return <EmptyState {...content} />;
};

export default TripEmptyStates;
