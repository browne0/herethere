import React, { useMemo, useState } from 'react';

import {
  ChevronUp,
  MapPin,
  Star,
  Info,
  MoreVertical,
  Heart,
  Trash2,
  Plus,
  Search,
  X,
  ChevronDown,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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

import { ParsedItineraryActivity } from '../../types';

interface SelectedActivitiesProps {
  tripId: string;
}

const SelectedActivities = ({ tripId }: SelectedActivitiesProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { activities, updateActivityStatus, removeActivity } = useActivitiesStore();

  const addedActivities = activities.filter(act => act.status === 'planned');
  const interestedActivities = activities.filter(act => act.status === 'interested');

  const defaultTab = useMemo(() => {
    if (addedActivities.length > 0) return 'added';
    if (interestedActivities.length > 0) return 'interested';
    return 'added';
  }, [addedActivities.length, interestedActivities.length]);

  const filterActivities = (activities: ParsedItineraryActivity[]) => {
    if (!searchQuery) return activities;
    const query = searchQuery.toLowerCase();
    return activities.filter(activity =>
      activity.recommendation.name.toLowerCase().includes(query)
    );
  };

  const filteredAdded = filterActivities(addedActivities);
  const filteredInterested = filterActivities(interestedActivities);

  const MiniActivityCard = ({
    activity,
    isInterested = false,
  }: {
    activity: ParsedItineraryActivity;
    isInterested: boolean;
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
                <DropdownMenuItem
                  onClick={handleRemove}
                  className="text-red-600 focus:text-red-600"
                >
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

  const MINIMUM_ACTIVITIES = 5;
  const canGenerateItinerary = addedActivities.length >= MINIMUM_ACTIVITIES;

  const GenerateItineraryButton = () =>
    canGenerateItinerary ? (
      <Button
        className="bg-blue-500 hover:bg-blue-600 text-white"
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          alert('Generate Itinerary clicked!');
        }}
      >
        Generate Itinerary
      </Button>
    ) : (
      <div className="flex items-center text-sm text-gray-500">
        <Info className="h-4 w-4 mr-2" />
        Add {MINIMUM_ACTIVITIES - addedActivities.length} more activities
      </div>
    );

  const ContextBar = () => (
    <>
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <ChevronUp className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-all transform group-hover:-translate-y-0.5" />
          <div className="text-center">
            <span className="text-lg font-semibold">{addedActivities.length}</span>
            <span className="text-gray-500 ml-1">Added</span>
          </div>
          <div className="text-center">
            <span className="text-lg font-semibold">{interestedActivities.length}</span>
            <span className="text-gray-500 ml-1">Interested</span>
          </div>
        </div>
        <GenerateItineraryButton />
      </div>
    </>
  );

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-r border-l shadow-lg lg:w-1/2 lg:mx-auto rounded-t-lg"
      style={{ zIndex: 100 }}
    >
      <Sheet open={isExpanded} onOpenChange={setIsExpanded}>
        {/* Collapsed view */}
        {!isExpanded && (
          <div
            role="button"
            onClick={() => setIsExpanded(true)}
            className="w-full lg:min-w-[calc(100%/2)] p-3 hover:bg-gray-50 transition-colors cursor-pointer group"
          >
            <ContextBar />
          </div>
        )}

        {/* Expanded view */}
        <SheetContent side="bottom" className="px-0 pb-0 md:w-1/2 mx-auto rounded">
          <SheetHeader className="px-4 mt-4">
            <SheetTitle>Selected Activities</SheetTitle>
            <SheetDescription className="sr-only">Selected activities list</SheetDescription>
          </SheetHeader>

          <Tabs defaultValue={defaultTab} className="mt-4">
            <div className="px-4 flex items-center justify-between gap-4">
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

            <TabsContent value="added" className="mt-4">
              <ScrollArea className="h-[calc(70vh-140px)]">
                {filteredAdded.map(activity => (
                  <MiniActivityCard key={activity.id} activity={activity} isInterested={false} />
                ))}
                {addedActivities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                    <p>No activities added yet</p>
                    <p className="text-sm mt-2">Add some activities to get started</p>
                  </div>
                ) : (
                  filteredAdded.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                      <p>No matching activities found</p>
                      <p className="text-sm mt-2">Try adjusting your search</p>
                    </div>
                  )
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="interested" className="mt-4">
              <ScrollArea className="h-[calc(70vh-140px)]">
                {filteredInterested.map(activity => (
                  <MiniActivityCard key={activity.id} activity={activity} isInterested={true} />
                ))}
                {interestedActivities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                    <p>No interested activities yet</p>
                    <p className="text-sm mt-2">
                      Mark some activities as interested to save them for later
                    </p>
                  </div>
                ) : (
                  filteredInterested.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                      <p>No matching activities found</p>
                      <p className="text-sm mt-2">Try adjusting your search</p>
                    </div>
                  )
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
          <div className="p-3 border">
            <ContextBar />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default SelectedActivities;
