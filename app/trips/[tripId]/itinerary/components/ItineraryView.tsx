'use client';

import { useCallback, useEffect, useState } from 'react';

import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { addDays, addHours } from 'date-fns';
import { Calendar, Clock, List, MapPin } from 'lucide-react';
import { toast } from 'sonner';

import { ParsedItineraryActivity } from '@/app/trips/[tripId]/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ActivityStatus, useActivitiesStore } from '@/lib/stores/activitiesStore';

// Event colors based on activity status
const statusColors: Record<ActivityStatus, string> = {
  interested: '#fcd34d',
  planned: '#93c5fd',
  confirmed: '#86efac',
  completed: '#d1d5db',
  cancelled: '#ef4444',
};

export function ItineraryView() {
  const { trip, updateActivity, setTrip } = useActivitiesStore();
  const [view, setView] = useState<'listWeek' | 'timeGridTwoDay'>('timeGridTwoDay');
  const [isRebalancing, setIsRebalancing] = useState(false);

  // Convert scheduled activities to FullCalendar events
  const scheduledEvents =
    trip?.activities
      .filter(activity => activity.status === 'planned' && activity.startTime && activity.endTime)
      .map(activity => ({
        id: activity.id,
        title: activity.recommendation.name,
        start: activity.startTime as Date,
        end: activity.endTime as Date,
        backgroundColor: statusColors[activity.status],
        extendedProps: {
          status: activity.status,
          location: activity.recommendation.location.address,
          duration: activity.recommendation.duration,
          recommendationId: activity.recommendationId,
        },
        editable: activity.status === 'planned',
      })) || [];

  // Get interested activities
  const interestedActivities = trip?.activities.filter(
    activity => activity.status === 'interested'
  );

  const handleEventDrop = async info => {
    try {
      await updateActivity(trip!.id, info.event.id, {
        startTime: info.event.start,
        endTime: info.event.end,
      });
      toast.success('Activity rescheduled');
    } catch (_error) {
      toast.error('Failed to reschedule activity');
      info.revert();
    }
  };

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

  // useEffect(() => {
  //   if (!trip) return;

  //   // Check if any activities have been updated since the last rebalance
  //   const needsRebalance = trip.activities.some(activity => {
  //     if (trip.lastRebalanced) {
  //       return new Date(activity.updatedAt).getTime() > new Date(trip.lastRebalanced).getTime();
  //     }
  //   });

  //   if (needsRebalance) {
  //     rebalanceSchedule();
  //   }
  // }, [trip?.id, trip?.activities, trip, rebalanceSchedule]);

  const handleAddToSchedule = async (activity: ParsedItineraryActivity) => {
    if (!trip) return;

    try {
      await updateActivity(trip.id, activity.id, { status: 'planned' });
      toast.success('Added to schedule!', {
        description: "We'll find the best time for this activity.",
      });
    } catch (_error) {
      toast.error('Failed to add to schedule');
    }
  };

  // Custom event rendering for list view
  const renderEventContent = eventInfo => {
    const { event } = eventInfo;
    const duration = event.extendedProps.duration;

    // if (view === 'listWeek') {
    //   return (
    //     <div className="flex flex-col space-y-1 py-1">
    //       <div className="font-medium">{event.title}</div>
    //       <div className="flex flex-col space-y-2 text-sm text-gray-600">
    //         <div className="flex items-center">
    //           <Clock className="h-4 w-4 mr-1.5" />
    //           <span>{`${Math.floor(duration / 60)}h ${duration % 60}min`}</span>
    //         </div>
    //         <div className="flex items-center">
    //           <MapPin className="h-4 w-4 mr-1.5" />
    //           <span>{event.extendedProps.location}</span>
    //         </div>
    //       </div>
    //     </div>
    //   );
    // }

    // Grid view event rendering
    return (
      <div className="p-1 overflow-hidden">
        <div className="font-medium text-sm truncate">{event.title}</div>
        <div className="text-xs opacity-75 truncate">{eventInfo.timeText}</div>
      </div>
    );
  };

  if (!trip) return null;

  console.log(trip.endDate);

  return (
    <div className="mt-[65px] w-1/2 h-[calc(100vh-65px)] flex flex-col">
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
                onClick={() => setView('listWeek')}
                className={view === 'listWeek' ? 'bg-gray-100' : ''}
              >
                <List className="w-4 h-4 mr-2" />
                List
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView('timeGridTwoDay')}
                className={view === 'timeGridTwoDay' ? 'bg-gray-100' : ''}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Calendar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-hidden">
        <FullCalendar
          plugins={[timeGridPlugin, listPlugin, interactionPlugin]}
          initialView={view}
          views={{
            timeGridTwoDay: {
              type: 'timeGrid',
              duration: { days: 2 },
            },
            listWeek: {
              type: 'list',
              titleFormat: { month: 'long', day: 'numeric' },
            },
          }}
          headerToolbar={{
            right: 'prev,next',
            center: 'title',
            left: 'timeGridTwoDay,timeGridDay',
          }}
          events={scheduledEvents}
          editable={true}
          eventDrop={handleEventDrop}
          eventContent={renderEventContent}
          slotMinTime="00:00:00"
          slotMaxTime="23:59:59"
          allDaySlot={false}
          eventOverlap={true}
          height="100%"
          validRange={{
            start: trip.startDate,
            end: addDays(trip.endDate, 1),
          }}
          scrollTime="08:00:00"
        />
      </div>
    </div>
  );
}
