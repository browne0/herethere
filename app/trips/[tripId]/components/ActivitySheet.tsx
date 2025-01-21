'use client';

import React, { useMemo, useState } from 'react';

import { useVirtualizer } from '@tanstack/react-virtual';
import { Heart, MapPin, MoreVertical, Plus, Search, Star, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActivitiesStore, useActivityMutations } from '@/lib/stores/activitiesStore';
import { formatNumberIntl } from '@/lib/utils';

import { ActivityStatus, ParsedItineraryActivity } from '../types';

const ITEM_HEIGHT = 116;

const MiniActivityCard = ({
  activity,
  isInterested,
}: {
  activity: ParsedItineraryActivity;
  isInterested: boolean;
}) => {
  const { updateActivity, removeActivity } = useActivityMutations();
  const handleStatusChange = async (status: ActivityStatus) => {
    try {
      await updateActivity.mutateAsync({
        updates: { status },
        activityId: activity.id,
      });
      toast.success('Activity status updated');
    } catch (error) {
      toast.error('Failed to update status', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  };

  const handleRemove = async () => {
    try {
      await removeActivity.mutateAsync(activity.id);
    } catch (error) {
      toast.error('Failed to remove activity', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
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
                <DropdownMenuItem onClick={() => handleStatusChange('planned')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add to trip
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => handleStatusChange('interested')}>
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
}: {
  activities: ParsedItineraryActivity[];
  isInterested: boolean;
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
            <MiniActivityCard activity={activities[virtualRow.index]} isInterested={isInterested} />
          </div>
        ))}
      </div>
    </div>
  );
};

export const ActivitySheet = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { trip } = useActivitiesStore();

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

  const EmptyState = ({ message, subMessage }: { message: string; subMessage: string }) => (
    <div className="flex flex-col items-center justify-center p-8 text-gray-500 h-full">
      <p>{message}</p>
      <p className="text-sm mt-2">{subMessage}</p>
    </div>
  );

  return (
    <SheetContent
      side="activity-right"
      className="px-0 pb-0 w-6/12 top-[144px] h-[calc(100vh-144px)]"
      onInteractOutside={e => {
        e.preventDefault();
      }}
    >
      <SheetHeader className="px-4">
        <SheetTitle>Selected Activities</SheetTitle>
        <SheetDescription className="sr-only">Selected activities list</SheetDescription>
      </SheetHeader>

      <Tabs defaultValue={defaultTab} className="mt-4 flex flex-col h-[calc(100%-95px)]">
        <div className="px-4 flex items-center justify-between gap-4 flex-shrink-0">
          <TabsList className="flex-shrink-0">
            <TabsTrigger value="added">Added ({addedActivities.length})</TabsTrigger>
            <TabsTrigger value="interested">Interested ({interestedActivities.length})</TabsTrigger>
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
            <VirtualizedActivityList activities={filteredAdded} isInterested={false} />
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
            <VirtualizedActivityList activities={filteredInterested} isInterested={true} />
          )}
        </TabsContent>
      </Tabs>
    </SheetContent>
  );
};
