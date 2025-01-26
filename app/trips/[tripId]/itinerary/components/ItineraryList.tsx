import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';
import { useActivitiesStore, useActivityMutations } from '@/lib/stores/activitiesStore';
import { format } from 'date-fns';
import { AlertTriangle, CalendarDays, Clock, MapPin, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { ActivityDetailSheet } from '../../components/ActivityDetailSheet';
import { getPrimaryTypeDisplay } from '../../components/RecommendationsView/ActivityCard';
import { ParsedItineraryActivity } from '../../types';
import ItineraryNoteSection from './ItineraryNoteSection';

interface ItineraryListProps {
  onMarkerHover: (activityId: string | null) => void;
}

const EmptyState = ({ tripId }: { tripId: string }) => (
  <div className="h-full flex flex-col items-center justify-center text-gray-500 p-8">
    <CalendarDays className="h-12 w-12 mb-4" />
    <h3 className="text-lg font-medium mb-2">No activities scheduled yet</h3>
    <p className="text-center text-sm mb-4">
      Add activities from the recommendations list to start building your itinerary.
    </p>
    <Link
      href={`/trips/${tripId}`}
      className="text-sm font-medium text-blue-600 hover:text-blue-700"
    >
      Browse Recommendations →
    </Link>
  </div>
);

function groupActivitiesByDay(activities: ParsedItineraryActivity[]) {
  const groups: { [key: string]: { date: Date; activities: ParsedItineraryActivity[] } } = {};

  activities.forEach(activity => {
    if (!activity.startTime) return;
    const startDate = new Date(activity.startTime);
    const dateKey = format(startDate, 'yyyy-MM-dd');

    if (!groups[dateKey]) {
      groups[dateKey] = {
        date: startDate,
        activities: [],
      };
    }

    groups[dateKey].activities.push(activity);
  });

  return Object.values(groups).sort((a, b) => a.date.getTime() - b.date.getTime());
}

function formatTimeRange(start: Date, end: Date): string {
  return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
}

export function ItineraryList({ onMarkerHover }: ItineraryListProps) {
  const { trip } = useActivitiesStore();
  const [openActivityId, setOpenActivityId] = useState<string | null>(null);
  const { updateActivity } = useActivityMutations();

  if (!trip) return null;

  if (trip.activities.length === 0) return <EmptyState tripId={trip.id} />;

  const scheduledActivities = trip.activities.filter(
    activity => activity.status === 'planned' && activity.startTime && activity.endTime
  );

  const groupedDays = groupActivitiesByDay(scheduledActivities);

  if (groupedDays.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 p-8">
        <CalendarDays className="h-12 w-12 mb-4" />
        <h3 className="text-lg font-medium mb-2">No activities scheduled yet</h3>
        <p className="text-center text-sm mb-4">
          Add activities from the recommendations list to start building your itinerary.
        </p>
        <Link
          href={`/trips/${trip?.id}`}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Browse Recommendations →
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="h-full overflow-y-auto">
        {groupedDays.map(dayGroup => (
          <div key={format(dayGroup.date, 'yyyy-MM-dd')} className="mb-6">
            <div className="sticky top-0 flex justify-between items-center bg-white p-4 z-10 border-b border-t">
              <h2 className="text-base sm:text-lg font-semibold">
                {format(dayGroup.date, 'EEEE, MMMM d, yyyy')}
              </h2>
              <Button variant="outline">
                Add activity{' '}
                <span className="">
                  <Plus className="w-4 h-4" />
                </span>
              </Button>
            </div>

            <div className="space-y-4 mt-4">
              {dayGroup.activities.map(activity => (
                <Card
                  key={activity.id}
                  className="border-l-4 mx-4 transition-all duration-200 hover:shadow-md"
                  style={{
                    borderLeftColor: activity.status === 'planned' ? '#4285f4' : '#d1d5db',
                  }}
                  onMouseEnter={() => onMarkerHover(activity.id)}
                  onMouseLeave={() => onMarkerHover(null)}
                >
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Sheet
                          modal={false}
                          open={openActivityId === activity.id}
                          onOpenChange={open => setOpenActivityId(open ? activity.id : null)}
                        >
                          <SheetTrigger asChild>
                            <button className="font-medium text-lg text-left hover:text-blue-600">
                              {activity.recommendation.name}
                            </button>
                          </SheetTrigger>
                          <ActivityDetailSheet
                            type="itinerary"
                            activity={activity}
                            isOpen={openActivityId === activity.id}
                          />
                        </Sheet>
                        <Badge variant="secondary">
                          {getPrimaryTypeDisplay(activity.recommendation)}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          {formatTimeRange(
                            new Date(activity.startTime!),
                            new Date(activity.endTime!)
                          )}
                        </span>
                      </div>
                      {activity.recommendation.location.address && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />

                          <a
                            href={`https://www.google.com/maps/place/?q=place_id:${activity.recommendation.googlePlaceId}`}
                            target="_blank"
                            className="hover:underline hover:text-blue-600"
                            rel="noreferrer"
                          >
                            <span>{activity.recommendation.location.address}</span>
                          </a>
                        </div>
                      )}
                      {activity.warning && (
                        <div className="text-sm text-yellow-600 mt-2 flex items-center gap-2">
                          <AlertTriangle className="fill-yellow-400 h-3.5 w-3.5 text-black" />
                          {activity.warning}
                        </div>
                      )}
                      <ItineraryNoteSection
                        activityId={activity.id}
                        initialNote={activity.note || ''}
                        onSave={async note => {
                          try {
                            await updateActivity.mutateAsync({
                              activityId: activity.id,
                              updates: { note: note },
                            });
                          } catch (_error) {
                            toast.error('Failed to save note');
                          }
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
