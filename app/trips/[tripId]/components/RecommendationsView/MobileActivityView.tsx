import React, { useState, useMemo } from 'react';

import { useVirtualizer } from '@tanstack/react-virtual';
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
import Link from 'next/link';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useActivitiesStore, useActivityMutations } from '@/lib/stores/activitiesStore';
import { cn } from '@/lib/utils';

import ActivityList from './ActivityList';
import MobileCategoryNavigation from './MobileCategoryNavigation';
import {
  ActivityCategoryType,
  ParsedTrip,
  ParsedItineraryActivity,
  ActivityStatus,
} from '../../types';

interface MiniActivityCardProps {
  activity: ParsedItineraryActivity;
  onStatusChange: () => Promise<void>;
  onRemove: () => Promise<void>;
}

interface MobileActivityViewProps {
  categories: ActivityCategoryType[];
  currentCategory: ActivityCategoryType | undefined;
  onCategoryChange: (category: string) => void;
  onPageChange: (page: number) => void;
  onHover: (id: string | null) => void;
  trip: ParsedTrip;
}

interface SortConfig {
  field: 'name' | 'rating' | 'neighborhood';
  direction: 'asc' | 'desc';
}

interface VirtualizedActivityListProps {
  activities: ParsedItineraryActivity[];
  onStatusChange: (activity: ParsedItineraryActivity) => Promise<void>;
  onRemove: (activityId: string) => Promise<void>;
}

const ItineraryProgress = ({
  addedActivities,
  minimumActivities = 1,
}: {
  addedActivities: ParsedItineraryActivity[];
  minimumActivities: number;
}) => {
  const { trip } = useActivitiesStore();
  const progress = Math.min((addedActivities.length / minimumActivities) * 100, 100);
  const remainingActivities = Math.max(minimumActivities - addedActivities.length, 0);
  const canGenerate = addedActivities.length >= minimumActivities;

  if (!trip) return null;

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
                {remainingActivities === 1 ? 'activity' : 'activities'} to your itinerary
              </span>
            </div>
          ) : (
            <span className="text-sm text-green-600">Ready to generate!</span>
          )}
          <Link
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px] px-4 py-2 rounded-lg"
            href={`/trips/${trip.id}/itinerary`}
          >
            View Itinerary
          </Link>
        </div>
      </div>
    </div>
  );
};

const MiniActivityCard: React.FC<MiniActivityCardProps> = ({ activity }) => {
  const { updateActivity, removeActivity } = useActivityMutations();

  const handleStatusChange = async () => {
    const newStatus: ActivityStatus = activity.status === 'interested' ? 'planned' : 'interested';
    try {
      await updateActivity.mutateAsync({
        updates: { status: newStatus },
        activityId: activity.id,
      });
    } catch (error) {
      toast.error('Error updating activity', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    }
  };

  const handleRemove = async () => {
    try {
      await removeActivity.mutateAsync(activity.id);
    } catch (error) {
      console.error('Error removing activity:', error);
    }
  };

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
            <DropdownMenuItem onClick={handleStatusChange}>
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
            <DropdownMenuItem onClick={handleRemove} className="text-red-600 focus:text-red-600">
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
              onStatusChange={() => onStatusChange(activities[virtualItem.index])}
              onRemove={() => onRemove(activities[virtualItem.index].id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const MyActivitiesContent = () => {
  const { trip } = useActivitiesStore();
  const { updateActivity, removeActivity } = useActivityMutations();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'name', direction: 'asc' });

  const filteredAndSortedActivities = useMemo(() => {
    if (!trip) return { added: [], saved: [] };
    const { activities } = trip;

    const addedActivities = activities.filter(act => act.status === 'planned');
    const savedActivities = activities.filter(act => act.status === 'interested');

    const filterActivities = (acts: ParsedItineraryActivity[]) => {
      return acts.filter(act => {
        const matchesSearch =
          act.recommendation.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          act.recommendation.location.neighborhood
            .toLowerCase()
            .includes(searchQuery.toLowerCase());

        return matchesSearch;
      });
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
  }, [trip, searchQuery, sortConfig]);

  const handleStatusChange = async (activity: ParsedItineraryActivity) => {
    if (!trip) return;
    const newStatus: ActivityStatus = activity.status === 'interested' ? 'planned' : 'interested';
    try {
      await updateActivity.mutateAsync({
        updates: { status: newStatus },
        activityId: activity.id,
      });
    } catch (error) {
      toast.error('Error updating activity', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    }
  };

  const handleRemove = async (activityId: string) => {
    if (!trip) return;
    try {
      await removeActivity.mutateAsync(activityId);
    } catch (error) {
      console.error('Error removing activity:', error);
    }
  };

  const handleSort = (field: SortConfig['field']) => {
    setSortConfig(current => ({
      field,
      direction: current.field === field && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  if (!trip) return null;

  const addedActivities = trip.activities.filter(act => act.status === 'planned');
  const MINIMUM_ACTIVITIES = 1;

  return (
    <div className="h-full flex flex-col">
      {/* Search and filters - fixed at top */}
      <div className="flex-none border-b">
        <ItineraryProgress
          addedActivities={addedActivities}
          minimumActivities={MINIMUM_ACTIVITIES}
        />
        <div className="relative m-4">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search activities..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9"
          />
        </div>

        {/* Sort buttons */}
        <div className="flex gap-2 items-center ml-4 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSort('name')}
            className={cn('whitespace-nowrap', sortConfig.field === 'name' && 'bg-gray-100')}
          >
            Name
            <ArrowUpDown className="h-3 w-3 ml-1" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSort('rating')}
            className={cn('whitespace-nowrap', sortConfig.field === 'rating' && 'bg-gray-100')}
          >
            Rating
            <ArrowUpDown className="h-3 w-3 ml-1" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSort('neighborhood')}
            className={cn(
              'whitespace-nowrap',
              sortConfig.field === 'neighborhood' && 'bg-gray-100'
            )}
          >
            Neighborhood
            <ArrowUpDown className="h-3 w-3 ml-1" />
          </Button>
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
  currentCategory,
  onCategoryChange,
  onPageChange,
  onHover,
}) => {
  const { categories, trip } = useActivitiesStore();

  if (!trip) {
    return null;
  }

  return (
    <Tabs defaultValue="discover" className="h-full flex flex-col">
      <div className="fixed top-8 left-0 right-0 bg-white z-10 border-b">
        <div className="px-4 py-2">
          <TabsList className="w-full">
            <TabsTrigger value="discover" className="flex-1">
              Discover
            </TabsTrigger>
            <TabsTrigger value="my-activities" className="flex-1">
              My Activities ({trip.activities.length})
            </TabsTrigger>
          </TabsList>
        </div>
      </div>

      <div className="flex-1 overflow-hidden mt-[57px] pb-[54px] h-full">
        <TabsContent value="discover" className="h-full mt-0">
          <MobileCategoryNavigation
            categories={categories}
            selectedCategory={currentCategory}
            onCategoryChange={onCategoryChange}
          />
          <div className="h-full flex flex-col">
            <ActivityList
              currentCategory={currentCategory}
              onPageChange={onPageChange}
              onHover={onHover}
            />
          </div>
        </TabsContent>

        <TabsContent value="my-activities" className="h-full mt-0">
          <MyActivitiesContent />
        </TabsContent>
      </div>
    </Tabs>
  );
};

export default MobileActivityView;
