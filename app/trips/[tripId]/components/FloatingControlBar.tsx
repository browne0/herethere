import React, { useMemo, useState } from 'react';

import { useVirtualizer } from '@tanstack/react-virtual';
import {
  MapPin,
  Star,
  Info,
  MoreVertical,
  Heart,
  Trash2,
  Plus,
  Search,
  X,
  List,
} from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ActivityStatus, useActivitiesStore } from '@/lib/stores/activitiesStore';
import { formatNumberIntl } from '@/lib/utils';

import { ParsedItineraryActivity } from '../types';

interface FloatingControlBarProps {
  tripId: string;
}

const ITEM_HEIGHT = 116; // Height of each MiniActivityCard in pixels

const MiniActivityCard = ({
  activity,
  isInterested = false,
  tripId,
  updateActivityStatus,
  removeActivity,
}: {
  activity: ParsedItineraryActivity;
  isInterested: boolean;
  tripId: string;
  updateActivityStatus: (id: string, status: ActivityStatus) => void;
  removeActivity: (id: string) => void;
}) => {
  const handleStatusChange = async () => {
    const newStatus: ActivityStatus = isInterested ? 'planned' : 'interested';
    try {
      const response = await fetch(`/api/trips/${tripId}/activities/${activity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update activity');
      updateActivityStatus(activity.id, newStatus);
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  };

  const handleRemove = async () => {
    try {
      const response = await fetch(`/api/trips/${tripId}/activities/${activity.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to remove activity');
      removeActivity(activity.id);
    } catch (error) {
      console.error('Error removing activity:', error);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50">
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">{activity.recommendation.name}</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isInterested ? (
                <DropdownMenuItem onClick={handleStatusChange}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add to trip
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleStatusChange}>
                  <Heart className="h-4 w-4 mr-2" />
                  Save for later
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleRemove} className="text-red-600 focus:text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Remove activity
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center space-x-1 text-sm text-gray-500">
          <span className="flex items-center">
            <Star className="h-3 w-3 mr-1 text-yellow-400" />
            {activity.recommendation.rating}
          </span>
          <span className="flex items-center">
            ({formatNumberIntl(activity.recommendation.reviewCount)})
          </span>
        </div>
        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
          <span className="flex items-center">
            <MapPin className="h-3 w-3 mr-1" />
            {activity.recommendation.location.neighborhood}
          </span>
        </div>
      </div>
    </div>
  );
};

const VirtualizedActivityList = ({
  activities,
  isInterested,
  tripId,
  updateActivityStatus,
  removeActivity,
}: {
  activities: ParsedItineraryActivity[];
  isInterested: boolean;
  tripId: string;
  updateActivityStatus: (id: string, status: ActivityStatus) => void;
  removeActivity: (id: string) => void;
}) => {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: activities.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <MiniActivityCard
              activity={activities[virtualRow.index]}
              isInterested={isInterested}
              tripId={tripId}
              updateActivityStatus={updateActivityStatus}
              removeActivity={removeActivity}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const FloatingControlBar = ({ tripId }: FloatingControlBarProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { trip, updateActivityStatus, removeActivity } = useActivitiesStore();

  const addedActivities = useMemo(() => {
    return trip?.activities.filter(act => act.status === 'planned') ?? [];
  }, [trip?.activities]);

  const interestedActivities = useMemo(() => {
    return trip?.activities.filter(act => act.status === 'interested') ?? [];
  }, [trip?.activities]);

  const defaultTab = useMemo(() => {
    if (addedActivities.length > 0) return 'added';
    if (interestedActivities.length > 0) return 'interested';
    return 'added';
  }, [addedActivities.length, interestedActivities.length]);

  if (!trip) return null;

  const filterActivities = (activities: ParsedItineraryActivity[]) => {
    if (!searchQuery) return activities;
    const query = searchQuery.toLowerCase();
    return activities.filter(activity =>
      activity.recommendation.name.toLowerCase().includes(query)
    );
  };

  const filteredAdded = filterActivities(addedActivities);
  const filteredInterested = filterActivities(interestedActivities);

  const MINIMUM_ACTIVITIES = 1;
  const canGenerateItinerary = addedActivities.length >= MINIMUM_ACTIVITIES;

  const ControlBarContent = () => (
    <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">
      <div className="flex items-center justify-between space-x-6">
        {isExpanded ? (
          <List className="w-5 h-5 text-gray-400" />
        ) : (
          <List className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-all " />
        )}
        <div className="text-center">
          <span className="text-lg font-semibold">{addedActivities.length}</span>
          <span className="text-gray-500 ml-2">Added</span>
        </div>
        <div className="text-center">
          <span className="text-lg font-semibold">{interestedActivities.length}</span>
          <span className="text-gray-500 ml-2">Interested</span>
        </div>
      </div>

      {canGenerateItinerary ? (
        <Link
          href={`/trips/${tripId}/itinerary`}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          onClick={e => {
            e.stopPropagation();
          }}
        >
          View Itinerary
        </Link>
      ) : (
        <div className="flex items-center text-sm text-gray-500">
          <Info className="h-4 w-4 mr-2" />
          Add an activity to see your itinerary
        </div>
      )}
    </div>
  );

  const EmptyState = ({ message, subMessage }: { message: string; subMessage: string }) => (
    <div className="flex flex-col items-center justify-center p-8 text-gray-500 h-full">
      <p>{message}</p>
      <p className="text-sm mt-2">{subMessage}</p>
    </div>
  );

  return (
    <div
      className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg max-w-md w-full mx-auto"
      style={{ zIndex: 100 }}
    >
      <Sheet open={isExpanded} onOpenChange={setIsExpanded}>
        {/* Collapsed bar */}
        {!isExpanded && (
          <div
            role="button"
            onClick={() => setIsExpanded(true)}
            className="w-full cursor-pointer group hover:bg-gray-50 transition-colors rounded-lg border border-slate-500"
          >
            <ControlBarContent />
          </div>
        )}

        {/* Expanded content */}
        <SheetContent side="right" className="px-0 pb-0 rounded-l-lg w-full lg:max-w-2xl">
          <SheetHeader className="px-4">
            <SheetTitle>Selected Activities</SheetTitle>
            <SheetDescription className="sr-only">Selected activities list</SheetDescription>
          </SheetHeader>

          <Tabs defaultValue={defaultTab} className="mt-4 flex flex-col h-[calc(100%-95px)]">
            <div className="px-4 flex items-center justify-between gap-4 flex-shrink-0">
              <TabsList className="flex-shrink-0">
                <TabsTrigger value="added">Added ({addedActivities.length})</TabsTrigger>
                <TabsTrigger value="interested">
                  Interested ({interestedActivities.length})
                </TabsTrigger>
              </TabsList>

              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search activities"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 h-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <TabsContent value="added" className="flex-1 mt-4 h-full">
              {addedActivities.length === 0 ? (
                <EmptyState
                  message="No activities added yet"
                  subMessage="Add some activities to get started"
                />
              ) : filteredAdded.length === 0 ? (
                <EmptyState
                  message="No matching activities found"
                  subMessage="Try adjusting your search"
                />
              ) : (
                <VirtualizedActivityList
                  activities={filteredAdded}
                  isInterested={false}
                  tripId={tripId}
                  updateActivityStatus={updateActivityStatus}
                  removeActivity={removeActivity}
                />
              )}
            </TabsContent>

            <TabsContent value="interested" className="flex-1 mt-4 h-full">
              {interestedActivities.length === 0 ? (
                <EmptyState
                  message="No interested activities yet"
                  subMessage="Mark some activities as interested to save them for later"
                />
              ) : filteredInterested.length === 0 ? (
                <EmptyState
                  message="No matching activities found"
                  subMessage="Try adjusting your search"
                />
              ) : (
                <VirtualizedActivityList
                  activities={filteredInterested}
                  isInterested={true}
                  tripId={tripId}
                  updateActivityStatus={updateActivityStatus}
                  removeActivity={removeActivity}
                />
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default FloatingControlBar;
