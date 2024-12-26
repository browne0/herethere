import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Star,
  MoreVertical,
  Heart,
  Plus,
  Trash2,
  Search,
  ArrowUpDown,
  Info,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ActivityStatus, useActivitiesStore } from '@/lib/stores/activitiesStore';
import { ActivityCategoryType, ParsedTrip, ParsedItineraryActivity } from '../../types';
import ActivityList from './ActivityList';
import MobileCategoryNavigation from './MobileCategoryNavigation';
import { ActivityRecommendation } from '@/lib/types/recommendations';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface MiniActivityCardProps {
  activity: ParsedItineraryActivity;
  tripId: string;
  onStatusChange: () => Promise<void>;
  onRemove: () => Promise<void>;
}

interface MyActivitiesContentProps {
  trip: ParsedTrip;
  activities: ParsedItineraryActivity[];
}

interface MobileActivityViewProps {
  categories: ActivityCategoryType[];
  currentCategory: ActivityCategoryType | undefined;
  onCategoryChange: (category: string) => void;
  onPageChange: (page: number) => void;
  onAdd: (activity: ActivityRecommendation, newStatus: ActivityStatus) => Promise<void>;
  onHover: (id: string | null) => void;
  trip: ParsedTrip;
}

interface SortConfig {
  field: 'name' | 'rating' | 'neighborhood';
  direction: 'asc' | 'desc';
}

interface VirtualizedActivityListProps {
  activities: ParsedItineraryActivity[];
  tripId: string;
  onStatusChange: (activity: ParsedItineraryActivity) => Promise<void>;
  onRemove: (activityId: string) => Promise<void>;
}

const ItineraryProgress = ({
  addedActivities,
  minimumActivities = 5,
  onGenerate,
}: {
  addedActivities: ParsedItineraryActivity[];
  minimumActivities: number;
  onGenerate: () => void;
}) => {
  const progress = Math.min((addedActivities.length / minimumActivities) * 100, 100);
  const remainingActivities = Math.max(minimumActivities - addedActivities.length, 0);
  const canGenerate = addedActivities.length >= minimumActivities;

  return (
    <div className="p-4 bg-white border-b">
      <div className="space-y-3">
        {/* Progress Stats */}
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium">Itinerary Progress</span>
          <span className="text-gray-500">
            {addedActivities.length}/{minimumActivities} activities
          </span>
        </div>

        {/* Progress Bar */}
        <Progress value={progress} className="h-2" />

        {/* Action Area */}
        <div className="flex items-center justify-between gap-3">
          {!canGenerate ? (
            <div className="flex items-center text-sm text-gray-600">
              <Info className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>
                Add {remainingActivities} more{' '}
                {remainingActivities === 1 ? 'activity' : 'activities'}
              </span>
            </div>
          ) : (
            <span className="text-sm text-green-600">Ready to generate!</span>
          )}
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
            onClick={onGenerate}
            disabled={!canGenerate}
          >
            Generate Itinerary
          </Button>
        </div>
      </div>
    </div>
  );
};

const MiniActivityCard: React.FC<MiniActivityCardProps> = ({
  activity,
  tripId,
  onStatusChange,
  onRemove,
}) => {
  return (
    <div className="p-4 border-b">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-medium">{activity.recommendation.name}</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
            <span className="flex items-center">
              <Star className="h-3 w-3 mr-1 text-yellow-400" />
              {activity.recommendation.rating}
            </span>
            <span className="flex items-center">
              <MapPin className="h-3 w-3 mr-1" />
              {activity.recommendation.location.neighborhood}
            </span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onStatusChange}>
              {activity.status === 'interested' ? (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add to trip
                </>
              ) : (
                <>
                  <Heart className="h-4 w-4 mr-2" />
                  Save for later
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRemove} className="text-red-600 focus:text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Remove activity
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

const VirtualizedActivityList: React.FC<VirtualizedActivityListProps> = ({
  activities,
  tripId,
  onStatusChange,
  onRemove,
}) => {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: activities.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88,
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <MiniActivityCard
              activity={activities[virtualItem.index]}
              tripId={tripId}
              onStatusChange={() => onStatusChange(activities[virtualItem.index])}
              onRemove={() => onRemove(activities[virtualItem.index].id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const MyActivitiesContent: React.FC<MyActivitiesContentProps> = ({ trip, activities }) => {
  const { updateActivityStatus, removeActivity } = useActivitiesStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'name', direction: 'asc' });

  const handleStatusChange = async (activity: ParsedItineraryActivity): Promise<void> => {
    const newStatus: ActivityStatus = activity.status === 'interested' ? 'planned' : 'interested';
    try {
      const response = await fetch(`/api/trips/${trip.id}/activities/${activity.id}`, {
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

  const handleRemove = async (activityId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/trips/${trip.id}/activities/${activityId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to remove activity');
      removeActivity(activityId);
    } catch (error) {
      console.error('Error removing activity:', error);
    }
  };

  const filteredAndSortedActivities = useMemo(() => {
    const addedActivities = activities.filter(act => act.status === 'planned');
    const savedActivities = activities.filter(act => act.status === 'interested');

    const filterActivities = (acts: ParsedItineraryActivity[]) => {
      return acts.filter(
        act =>
          act.recommendation.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          act.recommendation.location.neighborhood.toLowerCase().includes(searchQuery.toLowerCase())
      );
    };

    const sortActivities = (acts: ParsedItineraryActivity[]) => {
      return [...acts].sort((a, b) => {
        let aValue: string | number, bValue: string | number;

        switch (sortConfig.field) {
          case 'name':
            aValue = a.recommendation.name;
            bValue = b.recommendation.name;
            break;
          case 'rating':
            aValue = a.recommendation.rating;
            bValue = b.recommendation.rating;
            if (sortConfig.direction === 'asc') {
              return aValue - bValue;
            }
            return bValue - aValue;
          case 'neighborhood':
            aValue = a.recommendation.location.neighborhood;
            bValue = b.recommendation.location.neighborhood;
            break;
          default:
            return 0;
        }

        if (sortConfig.field !== ('rating' as SortConfig['field'])) {
          return sortConfig.direction === 'asc'
            ? aValue.toString().localeCompare(bValue.toString())
            : bValue.toString().localeCompare(aValue.toString());
        }
        return 0;
      });
    };

    return {
      added: sortActivities(filterActivities(addedActivities)),
      saved: sortActivities(filterActivities(savedActivities)),
    };
  }, [activities, searchQuery, sortConfig]);

  const handleSort = (field: SortConfig['field']) => {
    setSortConfig(current => ({
      field,
      direction: current.field === field && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const addedActivities = activities.filter(act => act.status === 'planned');

  const MINIMUM_ACTIVITIES = 5;
  const canGenerateItinerary = addedActivities.length >= MINIMUM_ACTIVITIES;

  const GenerateItineraryButton = () =>
    canGenerateItinerary ? (
      <Button
        className="bg-blue-500 hover:bg-blue-600 text-white mx-auto w-full"
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

  return (
    <div className="h-full flex flex-col">
      {/* Search and filters - fixed at top */}
      <div className="flex-none border-b">
        <ItineraryProgress
          addedActivities={addedActivities}
          minimumActivities={MINIMUM_ACTIVITIES}
          onGenerate={() => {}}
        />
        <div className="relative mb-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search activities..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {/* Your sort buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSort('name')}
            className={cn('whitespace-nowrap', sortConfig.field === 'name' && 'bg-gray-100')}
          >
            Name
            <ArrowUpDown className="h-3 w-3 ml-1" />
          </Button>
          {/* Other sort buttons */}
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y">
          {/* Added to Trip Section */}
          <div>
            <div className="bg-gray-50 px-4 py-2 border-y">
              <h2 className="text-sm font-medium text-gray-500">
                Added to Trip ({filteredAndSortedActivities.added.length})
              </h2>
            </div>
            <VirtualizedActivityList
              activities={filteredAndSortedActivities.added}
              tripId={trip.id}
              onStatusChange={handleStatusChange}
              onRemove={handleRemove}
            />
          </div>

          {/* Saved for Later Section */}
          <div>
            <div className="bg-gray-50 px-4 py-2 border-y">
              <h2 className="text-sm font-medium text-gray-500">
                Saved for Later ({filteredAndSortedActivities.saved.length})
              </h2>
            </div>
            <VirtualizedActivityList
              activities={filteredAndSortedActivities.saved}
              tripId={trip.id}
              onStatusChange={handleStatusChange}
              onRemove={handleRemove}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const MobileActivityView: React.FC<MobileActivityViewProps> = ({
  categories,
  currentCategory,
  onCategoryChange,
  onPageChange,
  onHover,
  onAdd,
  trip,
}) => {
  const { activities } = useActivitiesStore();

  return (
    <Tabs defaultValue="discover" className="h-full flex flex-col">
      <div className="fixed top-8 left-0 right-0 bg-white z-10 border-b">
        <div className="px-4 py-2">
          <TabsList className="w-full">
            <TabsTrigger value="discover" className="flex-1">
              Discover
            </TabsTrigger>
            <TabsTrigger value="my-activities" className="flex-1">
              My Activities ({activities.length})
            </TabsTrigger>
          </TabsList>
        </div>
      </div>

      <div className="flex-1 overflow-hidden mt-14">
        <TabsContent value="discover" className="h-full mt-0">
          <div className="h-full flex flex-col">
            <div className="fixed top-20 left-0 right-0 bg-white z-10 border-b">
              <MobileCategoryNavigation
                categories={categories}
                selectedCategory={currentCategory}
                onCategoryChange={onCategoryChange}
              />
            </div>
            <div className="flex-1 overflow-y-auto pt-12 mt-4">
              <ActivityList
                currentCategory={currentCategory}
                onPageChange={onPageChange}
                onHover={onHover}
                onAdd={onAdd}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="my-activities" className="h-full mt-0">
          <MyActivitiesContent trip={trip} activities={activities} />
        </TabsContent>
      </div>
    </Tabs>
  );
};

export default MobileActivityView;
