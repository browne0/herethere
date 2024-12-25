import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Info, Sliders, Trash2 } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Drawer } from 'vaul';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { ActivityStatus, useActivitiesStore } from '@/lib/stores/activitiesStore';
import { ActivityRecommendation } from '@/lib/types/recommendations';
import { cn } from '@/lib/utils';

import ActivityCard from './ActivityCard';
import RecommendationsMapView from './RecommendationsMapView';
import SelectedActivities from './SelectedActivities';
import { ActivityCategoryType, ParsedTrip } from '../../types';
import CategoryNavigation from './CategoryNavigation';
import RecommendationsLoadingState from './RecommendationsLoadingState';

interface RecommendationsViewProps {
  categories: ActivityCategoryType[];
  onDeleteClick: () => void;
  trip: ParsedTrip;
  isEditModalOpen: boolean;
}

export function RecommendationsView({
  categories,
  onDeleteClick,
  trip,
  isEditModalOpen,
}: RecommendationsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const snapPoints = ['225px', 0.915];

  const searchParams = useSearchParams();

  // States for both desktop and mobile
  const selectedCategory = searchParams.get('category') || 'must-see';
  const [hoveredActivityId, setHoveredActivityId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [snap, setSnap] = useState<number | string | null>(snapPoints[0]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Global state
  const { addActivity, updateActivityStatus, findActivityByRecommendationId } =
    useActivitiesStore();

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

  // URL handlers
  const handlePageChange = useCallback(
    async (newPage: number) => {
      setIsLoading(true);
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      current.set('page', newPage.toString());
      const search = current.toString();
      const query = search ? `?${search}` : '';
      await router.push(`${pathname}${query}`);
    },
    [searchParams, pathname, router]
  );

  const handleCategoryChange = useCallback(
    async (categoryType: string) => {
      setIsLoading(true);
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      current.set('category', categoryType);
      current.set('page', '1');
      const search = current.toString();
      const query = search ? `?${search}` : '';
      await router.push(`${pathname}${query}`);
    },
    [searchParams, pathname, router]
  );

  useEffect(() => {
    if (currentCategory?.activities) {
      setIsLoading(false);
    }
  }, [currentCategory]);

  // Activity management handlers
  const handleAddActivity = async (activity: ActivityRecommendation, newStatus: ActivityStatus) => {
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

  // Pagination component
  const PaginationComponent = () => {
    if (!currentCategory?.pagination) return null;

    const { currentPage, totalPages } = currentCategory.pagination;

    return (
      <Pagination className="mt-8 mb-[64px]">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={() => handlePageChange(currentPage - 1)}
              className={cn({ 'pointer-events-none opacity-50': currentPage === 1 })}
            />
          </PaginationItem>

          {totalPages <= 5 ? (
            // Show all pages if total is 5 or less
            [...Array(totalPages)].map((_, i) => (
              <PaginationItem key={i + 1}>
                <PaginationLink
                  href="#"
                  onClick={() => handlePageChange(i + 1)}
                  isActive={currentPage === i + 1}
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))
          ) : (
            // Show context around current page for larger page counts
            <>
              {/* Always show first page */}
              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={() => handlePageChange(1)}
                  isActive={currentPage === 1}
                >
                  1
                </PaginationLink>
              </PaginationItem>

              {/* Show ellipsis if we're not near the start */}
              {currentPage > 3 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}

              {/* Show adjacent pages around current page */}
              {[...Array(3)].map((_, i) => {
                const pageNum = currentPage + (i - 1); // Show previous, current, and next
                if (pageNum > 1 && pageNum < totalPages) {
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        href="#"
                        onClick={() => handlePageChange(pageNum)}
                        isActive={currentPage === pageNum}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                }
                return null;
              })}

              {/* Show ellipsis if we're not near the end */}
              {currentPage < totalPages - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}

              {/* Always show last page */}
              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={() => handlePageChange(totalPages)}
                  isActive={currentPage === totalPages}
                >
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            </>
          )}

          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={() => handlePageChange(currentPage + 1)}
              className={cn({ 'pointer-events-none opacity-50': currentPage === totalPages })}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  // Activity list component
  const ActivityList = () => (
    <>
      {isLoading ? (
        <RecommendationsLoadingState />
      ) : (
        <>
          <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 flex items-center">
              <Info className="w-4 h-4 mr-2 inline" />
              <span>Personalized Recommendations</span>
            </h3>
            <p className="text-gray-500 text-sm">
              We've curated these activities based on your preferences. Add them to your trip and
              we'll create an optimized itinerary.
            </p>
          </div>

          <div className="py-4">
            <h2 className="text-2xl font-semibold">{currentCategory?.title}</h2>
            <p className="text-md text-gray-600">{currentCategory?.description}</p>
          </div>

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

          {currentCategory?.pagination && <PaginationComponent />}
        </>
      )}
    </>
  );

  return (
    <div className="relative bg-gray-50">
      {/* Desktop Layout */}
      <div className="hidden lg:flex lg:flex-col h-full">
        <div className="bg-white shadow fixed top-[65px] z-50 w-full">
          <div className="flex items-center justify-between w-full border-b border-gray-200">
            <div className="flex-1 relative min-w-0">
              <CategoryNavigation
                categories={categories}
                selectedCategory={selectedCategory}
                handleCategoryChange={handleCategoryChange}
              />
            </div>

            <div className="flex items-center gap-3 px-4 flex-shrink-0 border-l border-gray-200 bg-white">
              <Button variant="outline" className="flex items-center gap-2">
                <Sliders className="h-4 w-4" />
                Filters
              </Button>

              <button
                onClick={onDeleteClick}
                className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-md transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                Delete Trip
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-7/12 mt-[144px]">
            <div className="p-4 h-full overflow-y-auto" ref={scrollContainerRef}>
              <ActivityList />
            </div>
          </div>
          <div className="w-5/12 fixed top-[144px] right-0 bottom-0">
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
        {!isEditModalOpen && <SelectedActivities tripId={trip.id} />}
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden h-full">
        <div
          className={cn('mt-[64px]', {
            'h-screen': snap === snapPoints[1],
            'h-[calc(100vh-289px)]': snap !== snapPoints[1],
          })}
        >
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
        <Drawer.Root
          open
          snapPoints={snapPoints}
          activeSnapPoint={snap}
          setActiveSnapPoint={setSnap}
          modal={false}
          dismissible={false}
        >
          <Drawer.Overlay className="fixed inset-0 bg-black/40" />
          <Drawer.Content className="fixed flex flex-col bg-white border border-gray-200 border-b-none rounded-t-[10px] top-0 right-0 left-0 outline-none h-full">
            <Drawer.Handle
              aria-hidden
              className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 my-4"
            />
            <Drawer.Title />
            <Drawer.Description />
            <div
              className={cn('px-4 pb-8', {
                'overflow-y-auto': snap === snapPoints[1],
                'overflow-hidden': snap !== snapPoints[1],
              })}
            >
              <ActivityList />
            </div>
          </Drawer.Content>
        </Drawer.Root>
      </div>
    </div>
  );
}

export default RecommendationsView;
