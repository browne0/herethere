'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { EventContentArg, EventDropArg } from '@fullcalendar/core/index.js';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { addDays } from 'date-fns';
import { Calendar, List, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import './calendar-overrides.css';

import { ActivityStatus, ParsedItineraryActivity } from '@/app/trips/[tripId]/types';
import { Button } from '@/components/ui/button';
import { useActivitiesStore, useActivityMutations } from '@/lib/stores/activitiesStore';

import ItineraryLoading from './ItineraryLoading';

function isValidActivityStatus(status: string): status is ActivityStatus {
  return ['interested', 'planned', 'confirmed', 'completed', 'cancelled'].includes(status);
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
  confirmed: '#86efac',
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

  if (!trip) return <ItineraryLoading />;

  console.log(trip.activities);

  // Convert scheduled activities to FullCalendar events
  const scheduledEvents = trip?.activities
    .filter(activity => activity.status === 'planned' && activity.startTime && activity.endTime)
    .map(activity => {
      // Ensure we have a valid status before accessing statusColors
      const status = isValidActivityStatus(activity.status) ? activity.status : 'planned';

      return {
        id: activity.id,
        title: activity.recommendation.name,
        start: activity.startTime as Date,
        end: activity.endTime as Date,
        backgroundColor: statusColors[status], // Now TypeScript knows this is safe
        extendedProps: {
          status: activity.status,
          location: activity.recommendation.location.address,
          duration: activity.recommendation.duration,
          recommendationId: activity.recommendationId,
        },
        editable: activity.status === 'planned',
      };
    });

  const handleEventDrop = async (info: EventDropArg) => {
    try {
      await updateActivity.mutateAsync({
        activityId: info.event.id,
        updates: {
          startTime: info.event.start,
          endTime: info.event.end,
        },
      });
      toast.success('Activity rescheduled');
    } catch (_error) {
      toast.error('Failed to reschedule activity');
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

  // Custom event rendering for list view
  const renderEventContent = (eventInfo: EventContentArg) => {
    const { event } = eventInfo;

    if (view === 'listMonth') {
      return (
        <div className="flex flex-col space-y-1 py-1">
          <div className="font-medium">{event.title}</div>
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
      <div className="p-1 overflow-hidden">
        <div className="font-medium text-sm truncate">{event.title}</div>
        <div className="text-xs opacity-75 truncate">{eventInfo.timeText}</div>
        <div className="text-xs opacity-75 truncate">{event.extendedProps.location}</div>
      </div>
    );
  };

  const numDays = getDaysBetweenDates(trip.startDate, trip.endDate);

  return (
    <div className="mt-[65px] lg:w-1/2 h-[calc(100vh-65px)] flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{trip.title}</h1>
            <div className="flex items-center mt-1 text-sm text-gray-500">
              <span>
                {new Date(trip.startDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
                {' - '}
                {new Date(trip.endDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <span className="mx-2">•</span>
              <span>{`${scheduledEvents.length} activities`}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={rebalanceSchedule}
              disabled={isRebalancing}
            >
              {isRebalancing ? 'Optimizing...' : 'Optimize Schedule'}
            </Button>
            <div className="border rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setView('listMonth');
                  calendarRef.current!.getApi().changeView('listMonth');
                }}
                className={view === 'listMonth' ? 'bg-gray-100' : ''}
              >
                <List className="w-4 h-4 mr-1" />
                List
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setView('timeGrid');
                  calendarRef.current!.getApi().changeView('timeGrid');
                }}
                className={view === 'timeGrid' ? 'bg-gray-100' : ''}
              >
                <Calendar className="w-4 h-4 mr-1" />
                Calendar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-hidden bg-white px-4 mb-4">
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
          dayHeaderFormat={{ weekday: 'long', month: 'numeric', day: 'numeric', omitCommas: true }}
          validRange={{
            start: trip.startDate,
            end: addDays(trip.endDate, 1),
          }}
          nowIndicator
          scrollTime="08:00:00"
          ref={calendarRef}
        />
      </div>
    </div>
  );
}
