'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { EventContentArg, EventDropArg } from '@fullcalendar/core/index.js';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { addDays } from 'date-fns';
import { AlertTriangle, CalendarDays, MapPin } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import './calendar-overrides.css';

import { ActivityStatus, ParsedItineraryActivity } from '@/app/trips/[tripId]/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useActivitiesStore, useActivityMutations } from '@/lib/stores/activitiesStore';

import { ItineraryHeader } from './ItineraryHeader';
import ItineraryLoading from './ItineraryLoading';
import ItineraryRebalancing from './ItineraryRebalancing';

function isValidActivityStatus(status: string): status is ActivityStatus {
  return ['interested', 'planned', 'completed', 'cancelled'].includes(status);
}

function getDaysBetweenDates(date1: Date, date2: Date) {
  // Parse the dates
  const startDate = new Date(date1).getTime();
  const endDate = new Date(date2).getTime();

  // Calculate the difference in milliseconds
  const timeDifference = Math.abs(endDate - startDate);

  // Convert the difference to days
  const daysDifference = timeDifference / (1000 * 60 * 60 * 24);

  return daysDifference + 1;
}

// Event colors based on activity status
const statusColors: Record<ActivityStatus, string> = {
  interested: '#fcd34d',
  planned: '#4285f4',
  completed: '#d1d5db',
  cancelled: '#ef4444',
};

export function ItineraryView() {
  const { trip, setTrip } = useActivitiesStore();
  const { updateActivity } = useActivityMutations();
  const [view, setView] = useState<'listMonth' | 'timeGrid'>('listMonth');
  const [isRebalancing, setIsRebalancing] = useState(false);
  const calendarRef = useRef<FullCalendar>(null);

  const rebalanceSchedule = useCallback(async () => {
    if (!trip) return;

    setIsRebalancing(true);
    try {
      const response = await fetch(`/api/trips/${trip.id}/activities/rebalance`, {
        method: 'POST',
      });

      if (response.ok) {
        const { trip: updatedTrip } = await response.json();
        setTrip(updatedTrip);

        // console.log(updatedTrip.activities);
      }
    } catch (error) {
      toast.error('Failed to rebalance schedule');
      console.error('Rebalance error:', error);
    } finally {
      setIsRebalancing(false);
    }
  }, [setTrip, trip]);

  useEffect(() => {
    if (!trip) return;

    if (trip.lastRebalanced === null) {
      rebalanceSchedule();
    }
  }, [rebalanceSchedule, trip]);

  const scheduledEvents = useMemo(() => {
    if (!trip) return [];

    return trip?.activities
      .filter(activity => activity.status === 'planned' && activity.startTime && activity.endTime)
      .map(activity => {
        const status = isValidActivityStatus(activity.status) ? activity.status : 'planned';
        return {
          id: activity.id,
          title: activity.recommendation.name,
          start: activity.startTime as Date,
          end: activity.endTime as Date,
          backgroundColor: statusColors[status],
          extendedProps: {
            status: activity.status,
            location: activity.recommendation.location.address,
            duration: activity.recommendation.duration,
            recommendationId: activity.recommendationId,
            warning: activity.warning,
          },
          editable: activity.status === 'planned',
        };
      });
  }, [trip]);

  const renderEventContent = useCallback(
    (eventInfo: EventContentArg) => {
      const { event } = eventInfo;

      const getStreetAddress = (fullAddress: string) => {
        return fullAddress.split(',')[0].trim();
      };

      if (view === 'listMonth') {
        return (
          <div className="flex flex-col space-y-1 py-1">
            <div className="font-medium flex items-center gap-2">
              {event.title}
              {event.extendedProps.warning && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertTriangle className="fill-yellow-400 h-3.5 w-3.5 text-black" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{event.extendedProps.warning}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="flex flex-col space-y-2 text-sm text-gray-600">
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{event.extendedProps.location}</span>
              </div>
            </div>
          </div>
        );
      }

      // Grid view event rendering
      return (
        <div className="p-1 overflow-hidden relative">
          {event.extendedProps.warning && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="absolute top-1 right-1">
                    <AlertTriangle className="fill-yellow-400 h-3.5 w-3.5 text-black" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-[250px] z-50">
                  <p>{event.extendedProps.warning}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <div className="pr-4">
            <div className="font-medium text-xs break-words">{event.title}</div>
            <div className="text-xs opacity-75 truncate">{eventInfo.timeText}</div>
            <div className="text-xs opacity-75 truncate">
              {getStreetAddress(event.extendedProps.location)}
            </div>
          </div>
        </div>
      );
    },
    [view]
  );

  const EmptyState = () => (
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

  if (!trip) return <ItineraryLoading />;

  if (isRebalancing && trip)
    return (
      <ItineraryRebalancing
        tripId={trip.id}
        tripTitle={trip.title}
        startDate={trip.startDate}
        endDate={trip.endDate}
      />
    );

  const handleEventDrop = async (info: EventDropArg) => {
    try {
      const result = await updateActivity.mutateAsync({
        activityId: info.event.id,
        updates: {
          startTime: info.event.start,
          endTime: info.event.end,
        },
      });
      if (result.warning) {
        toast.warning('Opening Hours Warning', {
          description: result.warning,
        });
      } else {
        toast.success('Activity rescheduled');
      }
    } catch (error) {
      toast.error('Failed to reschedule activity', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
      info.revert();
    }
  };

  const handleAddToSchedule = async (activity: ParsedItineraryActivity) => {
    if (!trip) return;

    try {
      await updateActivity.mutateAsync({ activityId: activity.id, updates: { status: 'planned' } });
      toast.success('Added to schedule!', {
        description: "We'll find the best time for this activity.",
      });
    } catch (_error) {
      toast.error('Failed to add to schedule');
    }
  };

  const numDays = getDaysBetweenDates(trip.startDate, trip.endDate);

  return (
    <div className="mt-[65px] lg:w-1/2 h-[calc(100vh-65px)] flex flex-col">
      <ItineraryHeader
        tripId={trip.id}
        title={trip.title}
        startDate={trip.startDate}
        endDate={trip.endDate}
        activitiesCount={scheduledEvents.length}
        isRebalancing={isRebalancing}
        onRebalance={rebalanceSchedule}
        view={view}
        onViewChange={newView => {
          setView(newView);
          if (calendarRef.current) {
            calendarRef.current.getApi().changeView(newView);
          }
        }}
        disableViewToggle={scheduledEvents.length === 0}
      />
      {/* Calendar */}
      <div className="flex-1 overflow-hidden bg-white px-4 mb-4">
        {scheduledEvents.length === 0 ? (
          <EmptyState />
        ) : (
          <FullCalendar
            plugins={[timeGridPlugin, interactionPlugin, listPlugin]}
            initialView={view}
            headerToolbar={{
              right: 'prev,next',
              center: '',
              left: '',
            }}
            views={{
              timeGrid: {
                type: 'timeGrid',
                duration: { days: numDays > 7 ? 7 : numDays },
              },
            }}
            events={scheduledEvents}
            editable={true}
            eventDrop={handleEventDrop}
            eventContent={renderEventContent}
            slotMinTime="00:00:00"
            allDaySlot={false}
            eventOverlap={true}
            stickyHeaderDates={false}
            height="100%"
            dayHeaderFormat={{
              weekday: 'long',
              month: 'numeric',
              day: 'numeric',
              omitCommas: true,
            }}
            validRange={{
              start: trip.startDate,
              end: addDays(trip.endDate, 1),
            }}
            nowIndicator
            scrollTime="08:00:00"
            ref={calendarRef}
          />
        )}
      </div>
    </div>
  );
}
