import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Info, Sliders, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ActivityStatus, useActivitiesStore } from '@/lib/stores/activitiesStore';
import ActivityCard from './ActivityCard';
import { ActivityCategoryType } from '../../types';
import RecommendationsMapView from './RecommendationsMapView';

interface RecommendationsViewProps {
  categories: ActivityCategoryType[];
  onDeleteClick: () => void;
}

export function RecommendationsView({ categories, onDeleteClick }: RecommendationsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Local state
  const selectedCategory = searchParams.get('category') || 'must-see';

  const [hoveredActivityId, setHoveredActivityId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  // Global state
  const { addActivity, trip, updateActivityStatus, findActivityByRecommendationId } =
    useActivitiesStore();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to top when params change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [searchParams]);

  // Get current category data
  const currentCategory = useMemo(() => {
    return categories.find(category => category.type === selectedCategory);
  }, [categories, selectedCategory]);

  // Simplified handlers that only deal with URL updates
  const handlePageChange = useCallback(
    (newPage: number) => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      current.set('page', newPage.toString());
      const search = current.toString();
      const query = search ? `?${search}` : '';
      router.push(`${pathname}${query}`, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  const handleCategoryChange = useCallback(
    async (categoryType: string) => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      current.set('category', categoryType);
      current.set('page', '1'); // Reset to page 1 when changing categories
      const search = current.toString();
      const query = search ? `?${search}` : '';
      await router.push(`${pathname}${query}`, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  // Handle adding/updating activities
  const handleAddActivity = async (activity: any, newStatus: ActivityStatus) => {
    if (!trip) return;

    try {
      const existingActivity = findActivityByRecommendationId(activity.id);

      if (existingActivity) {
        const response = await fetch(`/api/trips/${trip.id}/activities/${existingActivity.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) throw new Error('Failed to update activity');

        updateActivityStatus(existingActivity.id, newStatus);
        toast.success('Activity updated!', {
          description:
            newStatus === 'planned'
              ? "We'll schedule this at the best time."
              : "We'll keep this in mind when planning.",
        });
      } else {
        const response = await fetch(`/api/trips/${trip.id}/activities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recommendationId: activity.id,
            status: newStatus,
          }),
        });

        if (!response.ok) throw new Error('Failed to add activity');

        const { activity: newActivity } = await response.json();
        addActivity(newActivity);
        toast.success('Activity added!', {
          description:
            newStatus === 'planned'
              ? "We'll optimize your schedule to fit this in."
              : "We'll keep this in your interests list.",
        });
      }
    } catch (error) {
      console.error('Error managing activity:', error);
      toast.error('Error', {
        description: 'Failed to manage activity. Please try again.',
      });
    }
  };

  return (
    <div className="flex flex-col bg-gray-50 h-[calc(100vh-73px)]">
      {/* Category Navigation */}
      <div className="bg-white shadow sticky top-[73px] z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide px-4">
            {categories.map(category => (
              <button
                key={category.type}
                onClick={() => handleCategoryChange(category.type)}
                className={`flex min-w-[100px] flex-col items-center justify-center py-4 
                  whitespace-nowrap transition-colors flex-shrink-0 relative 
                  ${
                    selectedCategory === category.type
                      ? 'text-black after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-black'
                      : 'text-gray-500 hover:text-black after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-transparent hover:after:bg-gray-200'
                  }`}
              >
                {category.icon}
                <span className="capitalize text-xs">{category.type.replace(/-/g, ' ')}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center flex-shrink-0 mr-4">
            <Button variant="outline" className="flex items-center gap-2">
              <Sliders className="h-4 w-4" />
              Filters
            </Button>
            {/* Delete Button */}
            <button
              onClick={onDeleteClick}
              className="flex text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-md transition-colors"
            >
              <Trash2 className="w-5 h-5 pr-1" />
              Delete Trip
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Activity List */}
        <div className="w-7/12">
          <div className="p-4 h-full overflow-y-auto">
            {/* Info Banner */}
            <div className="mx-auto">
              <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 flex items-center">
                  <Info className="w-4 h-4 mr-2 inline" />
                  <span>Personalized Recommendations</span>
                </h3>
                <p className="text-gray-500 text-sm">
                  We've curated these activities based on your preferences. Add them to your trip
                  and we'll create an optimized itinerary.
                </p>
              </div>
            </div>

            {/* Category Header */}
            <div className="py-4">
              <h2 className="text-2xl font-semibold">{currentCategory?.title}</h2>
              <p className="text-md text-gray-600">{currentCategory?.description}</p>
            </div>

            {/* Activity Grid */}
            {currentCategory?.activities?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-gray-500 text-lg">No activities found for this category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {currentCategory?.activities.map(activity => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    category={currentCategory}
                    onAdd={handleAddActivity}
                    isHighlighted={
                      hoveredActivityId === activity.id || selectedActivityId === activity.id
                    }
                    onHover={setHoveredActivityId}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {currentCategory?.pagination && (
              <div className="mt-8 flex justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentCategory.pagination!.currentPage - 1)}
                  disabled={!currentCategory.pagination.hasPreviousPage}
                >
                  Previous
                </Button>

                <span className="px-4 py-2 text-sm text-gray-600">
                  Page {currentCategory.pagination.currentPage} of{' '}
                  {currentCategory.pagination.totalPages}
                </span>

                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentCategory.pagination!.currentPage + 1)}
                  disabled={!currentCategory.pagination.hasNextPage}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Map View */}
        <div className="w-5/12 bg-gray-100">
          <RecommendationsMapView
            activities={currentCategory?.activities || []}
            currentCategory={selectedCategory}
            onMarkerHover={setHoveredActivityId}
            onMarkerSelect={setSelectedActivityId}
            hoveredActivityId={hoveredActivityId}
            selectedActivityId={selectedActivityId}
            trip={trip}
          />
        </div>
      </div>
    </div>
  );
}

export default RecommendationsView;
