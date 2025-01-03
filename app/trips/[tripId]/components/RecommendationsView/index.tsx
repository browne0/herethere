import React, { useCallback, useMemo, useState } from 'react';

import { Sliders, Trash2 } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Drawer } from 'vaul';

import { Button } from '@/components/ui/button';
import { useActivitiesStore } from '@/lib/stores/activitiesStore';
import { cn } from '@/lib/utils';

import ActivityList from './ActivityList';
import CategoryNavigation from './CategoryNavigation';
import MobileActivityView from './MobileActivityView';
import RecommendationsMapView from './RecommendationsMapView';
import FloatingControlBar from '../FloatingControlBar';

interface RecommendationsViewProps {
  onDeleteClick: () => void;
  isEditModalOpen: boolean;
}

interface ResponsiveMapContainerProps {
  /** The React children to render inside the container */
  children: React.ReactNode;
  /** Current snap point value between 0 and 1 */
  snap: number;
  /** Array of available snap points */
  snapPoints: number[];
  /** Optional className for additional styling */
  className?: string;
}

const ResponsiveMapContainer = ({ children, snap, className }: ResponsiveMapContainerProps) => {
  // Calculate height based on snap point
  const getMapHeight = (): string => {
    if (snap > 0.5) {
      return '90dvh';
    }

    // Convert snap points to viewport percentages
    const snapPercent = snap * 100;

    // Calculate remaining viewport height
    const remainingHeight = 100 - snapPercent;

    return `${remainingHeight}vh`;
  };

  return (
    <div
      className={cn('relative w-full transition-all duration-300 ease-in-out', className)}
      style={{
        height: getMapHeight(),
      }}
    >
      {children}
    </div>
  );
};

export function RecommendationsView({ onDeleteClick, isEditModalOpen }: RecommendationsViewProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // States
  const selectedCategory = searchParams.get('category') || 'must-see';
  const [hoveredActivityId, setHoveredActivityId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [snap, setSnap] = useState<number | string | null>(0.5);
  const snapPoints = [0.15, 0.5, 0.905];
  const activeSnapPercentage = typeof snap === 'number' ? snap : 0.5;

  // Global state
  const { trip, categories } = useActivitiesStore();

  // URL update handler
  const updateURL = useCallback(
    (newParams: URLSearchParams) => {
      const search = newParams.toString();
      const query = search ? `?${search}` : '';
      const newURL = `${pathname}${query}`;

      router.push(newURL);
    },
    [pathname, router]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set('page', newPage.toString());
      updateURL(newParams);
    },
    [searchParams, updateURL]
  );

  const handleCategoryChange = useCallback(
    (categoryType: string) => {
      const newParams = new URLSearchParams();
      newParams.set('category', categoryType);
      newParams.set('page', '1');
      updateURL(newParams);
    },
    [updateURL]
  );

  // Get current category data
  const currentCategory = useMemo(() => {
    return categories.find(category => category.type === selectedCategory);
  }, [categories, selectedCategory]);

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

        <div className="flex overflow-hidden">
          <div className="w-7/12 mt-[144px]">
            <ActivityList
              currentCategory={currentCategory}
              onPageChange={handlePageChange}
              onHover={setHoveredActivityId}
            />
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
          {!isEditModalOpen && trip && <FloatingControlBar tripId={trip.id} />}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden flex flex-col h-[100dvh]">
        {/* Map */}
        <ResponsiveMapContainer
          className="pt-[64px]"
          snap={activeSnapPercentage}
          snapPoints={snapPoints}
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
        </ResponsiveMapContainer>

        {/* Drawer */}
        {typeof document !== 'undefined' && trip && (
          <Drawer.Root
            open
            modal={false}
            snapPoints={snapPoints}
            activeSnapPoint={snap}
            setActiveSnapPoint={setSnap}
            dismissible={false}
            snapToSequentialPoint
          >
            <Drawer.Overlay className="fixed inset-0 bg-black/40" />
            <Drawer.Content className="bg-white flex flex-col rounded-t-[10px] fixed top-0 left-0 right-0 min-h-[25dvh] max-h-[100dvh] z-50">
              <div className="p-4 flex-none">
                <Drawer.Handle className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300" />
              </div>

              <Drawer.Title className="sr-only">Selected Activities</Drawer.Title>
              <Drawer.Description className="sr-only">
                Activities for {trip.title}
              </Drawer.Description>

              <div className={cn({ 'overflow-y-auto': activeSnapPercentage >= snapPoints[1] })}>
                <MobileActivityView
                  categories={categories}
                  currentCategory={currentCategory}
                  onCategoryChange={handleCategoryChange}
                  onPageChange={handlePageChange}
                  onHover={setHoveredActivityId}
                  trip={trip}
                />
              </div>
            </Drawer.Content>
          </Drawer.Root>
        )}
      </div>
    </div>
  );
}

export default RecommendationsView;
