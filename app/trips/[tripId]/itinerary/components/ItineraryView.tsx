'use client';

import { useEffect, useState } from 'react';

import { ChevronDown, ChevronUp, Clock, MapPin, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useActivitiesStore } from '@/lib/stores/activitiesStore';
import { cn } from '@/lib/utils';

import { ParsedItineraryActivity } from '../../types';

export function ItineraryView() {
  const { trip, updateActivityStatus, removeActivity } = useActivitiesStore();
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});
  const [isInterestedCollapsed, setIsInterestedCollapsed] = useState(false);
  const [isRebalancing, setIsRebalancing] = useState(false);

  useEffect(() => {
    if (!trip) return;

    // Check if any activities have been updated since the last rebalance
    const needsRebalance = trip.activities.some(activity => {
      return !trip.lastRebalanced || new Date(activity.updatedAt) > new Date(trip.lastRebalanced);
    });

    if (needsRebalance) {
      const rebalanceSchedule = async () => {
        setIsRebalancing(true);
        try {
          const response = await fetch(`/api/trips/${trip.id}/activities/rebalance`, {
            method: 'POST',
          });

          if (response.ok) {
            const { trip: updatedTrip } = await response.json();
            useActivitiesStore.setState({ trip: updatedTrip });
          }
        } catch (error) {
          toast.error('Failed to rebalance schedule');
          console.error('Rebalance error:', error);
        } finally {
          setIsRebalancing(false);
        }
      };

      rebalanceSchedule();
    }
  }, [trip?.id, trip?.activities, trip]);

  useEffect(() => {
    if (!trip) return;
    console.log(trip.activities);

    const scheduledActivities = trip.activities.filter(
      activity => activity.status === 'planned' && activity.startTime
    );

    // Group activities by day
    const groupedActivities = scheduledActivities.reduce<Record<string, typeof trip.activities>>(
      (acc, activity) => {
        if (!activity.startTime || !activity.endTime) {
          return acc;
        }
        const date = new Date(activity.startTime).toLocaleDateString();
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(activity);

        // Sort activities within each day by start time
        acc[date].sort((a, b) => {
          return new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime();
        });
        return acc;
      },
      {}
    );
    console.log(JSON.stringify(groupedActivities));
  }, [trip]);

  if (!trip) return null;

  // Separate scheduled and interested activities
  const interestedActivities = trip.activities.filter(activity => activity.status === 'interested');

  const scheduledActivities = trip.activities.filter(
    activity => activity.status === 'planned' && activity.startTime
  );

  // Group activities by day
  const groupedActivities = scheduledActivities.reduce<Record<string, typeof trip.activities>>(
    (acc, activity) => {
      if (!activity.startTime || !activity.endTime) {
        return acc;
      }
      const date = new Date(activity.startTime).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(activity);

      // Sort activities within each day by start time
      acc[date].sort((a, b) => {
        return new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime();
      });
      return acc;
    },
    {}
  );

  const formatTime = (date: string | Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDayDate = (date: string) => {
    const dayDate = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Check if it's today or tomorrow
    if (dayDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (dayDate.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }

    // Otherwise return full date
    return dayDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  const toggleDay = (date: string) => {
    setCollapsedDays(prev => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  const getDurationString = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}min`;
  };

  const handleAddToSchedule = async (activity: ParsedItineraryActivity) => {
    if (!trip) return;

    try {
      await updateActivityStatus(trip.id, activity.id, 'planned');
      toast.success('Added to schedule!', {
        description: "We'll find the best time for this activity.",
      });
    } catch (_error) {
      toast.error('Failed to add to schedule', {
        description: 'Please try again later.',
      });
    }
  };

  const handleRemoveActivity = async (activityId: string) => {
    if (!trip) return;

    try {
      await removeActivity(trip.id, activityId);
      toast.success('Activity removed');
    } catch (_error) {
      toast.error('Failed to remove activity', {
        description: 'Please try again later.',
      });
    }
  };

  return (
    <div className="mt-[65px] w-full max-w-md border-r border-gray-200 h-[calc(100vh-65px)] overflow-y-auto bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
        <h1 className="text-xl font-semibold">{trip.title}</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const rebalanceSchedule = async () => {
              setIsRebalancing(true);
              try {
                const response = await fetch(`/api/trips/${trip.id}/activities/rebalance`, {
                  method: 'POST',
                });

                if (response.ok) {
                  const { trip: updatedTrip } = await response.json();
                  useActivitiesStore.setState({ trip: updatedTrip });

                  toast.success('Schedule optimized successfully');
                }
              } catch (error) {
                toast.error('Failed to rebalance schedule');
                console.error('Rebalance error:', error);
              } finally {
                setIsRebalancing(false);
              }
            };
            rebalanceSchedule();
          }}
          disabled={isRebalancing}
          className="text-sm my-2"
        >
          {isRebalancing ? (
            <span className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Optimizing...
            </span>
          ) : (
            'Optimize Schedule'
          )}
        </Button>
        <div className="flex items-center mt-2 text-sm text-gray-500">
          <span>
            {trip?.startDate &&
              new Date(trip.startDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            {' - '}
            {trip?.endDate &&
              new Date(trip.endDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
          </span>
          <span className="mx-2">•</span>
          <span>{`${scheduledActivities.length} activities`}</span>
        </div>
      </div>

      {/* Days */}
      <div className="divide-y divide-gray-200">
        {Object.entries(groupedActivities)
          .sort(([dateA], [dateB]) => {
            return new Date(dateA).getTime() - new Date(dateB).getTime();
          })
          .map(([date, dayActivities]) => (
            <div key={date} className="bg-white">
              {/* Day header */}
              <button
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
                onClick={() => toggleDay(date)}
              >
                <div className="flex items-center space-x-2">
                  <h2 className="font-medium">{formatDayDate(date)}</h2>
                  <span className="text-sm text-gray-500">{`${dayActivities.length} activities`}</span>
                </div>
                {collapsedDays[date] ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                )}
              </button>

              {/* Activities for the day */}
              <div
                className={cn(
                  'px-4 space-y-6 transition-all duration-200',
                  collapsedDays[date] ? 'h-0 invisible opacity-0' : 'pb-4 visible opacity-100'
                )}
              >
                {dayActivities.map((activity, index) => (
                  <div key={activity.id} className="relative">
                    {/* Time connector line */}
                    {index !== dayActivities.length - 1 && (
                      <div className="absolute left-2 top-8 bottom-0 w-px bg-gray-200" />
                    )}

                    <div className="flex items-start space-x-4">
                      {/* Time */}
                      <div className="flex-shrink-0 w-16 pt-1">
                        <span className="text-sm text-gray-500">
                          {activity.startTime && formatTime(activity.startTime)}
                        </span>
                      </div>

                      {/* Activity card */}
                      <div className="flex-1">
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                          <div className="p-4">
                            <h3 className="font-medium">{activity.recommendation?.name}</h3>

                            <div className="mt-2 space-y-1">
                              <div className="flex items-center text-sm text-gray-600">
                                <Clock className="h-4 w-4 mr-1.5 flex-shrink-0" />
                                <span>
                                  Duration:{' '}
                                  {getDurationString(activity.recommendation?.duration || 0)}
                                </span>
                              </div>

                              <div className="flex items-start text-sm text-gray-600">
                                <MapPin className="h-4 w-4 mr-1.5 flex-shrink-0 mt-0.5" />
                                <span className="line-clamp-2">
                                  {activity.recommendation?.location?.address}
                                </span>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-end space-x-2">
                              <Button variant="outline" size="sm" className="text-sm">
                                Details
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-500 hover:text-gray-600"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* Interested Activities Section */}
      {interestedActivities.length > 0 && (
        <div className="border-t border-gray-200 mt-4">
          <button
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
            onClick={() => setIsInterestedCollapsed(!isInterestedCollapsed)}
          >
            <div className="flex items-center space-x-2">
              <h2 className="font-medium">Interested Activities</h2>
              <span className="text-sm text-gray-500">
                {`${interestedActivities.length} activities`}
              </span>
            </div>
            {isInterestedCollapsed ? (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            )}
          </button>

          <div
            className={cn(
              'px-4 space-y-4 transition-all duration-200',
              isInterestedCollapsed ? 'h-0 invisible opacity-0' : 'pb-4 visible opacity-100'
            )}
          >
            {interestedActivities.map(activity => (
              <div key={activity.id} className="bg-white rounded-lg border border-gray-200">
                <div className="p-4">
                  <h3 className="font-medium">{activity.recommendation?.name}</h3>

                  <div className="mt-2 space-y-1">
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-1.5 flex-shrink-0" />
                      <span>{getDurationString(activity.recommendation?.duration || 0)}</span>
                    </div>

                    <div className="flex items-start text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-1.5 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-2">
                        {activity.recommendation?.location?.address}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-end space-x-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="text-sm"
                      onClick={() => handleAddToSchedule(activity)}
                    >
                      Add to Schedule
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleRemoveActivity(activity.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
