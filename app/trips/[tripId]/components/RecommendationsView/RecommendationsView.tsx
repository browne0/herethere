import { useCallback, useMemo, useState } from 'react';

import { Map, Sliders, Trash2, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useActivitiesStore } from '@/lib/stores/activitiesStore';

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ParsedItineraryActivity } from '../../types';
import ActivityList from './ActivityList';
import CategoryNavigation from './CategoryNavigation';
import MobileActivityView from './MobileActivityView';
import RecommendationsMapView from './RecommendationsMapView';

interface RecommendationsViewProps {
  onDeleteClick: () => void;
  onActivityDelete: (activity: ParsedItineraryActivity) => void;
}

export function RecommendationsView({ onDeleteClick, onActivityDelete }: RecommendationsViewProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // States
  const selectedCategory = searchParams.get('category') || 'for-you';
  const [hoveredActivityId, setHoveredActivityId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

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

  if (!trip) {
    return null;
  }

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
          <div className="w-6/12 mt-[144px]">
            <ActivityList
              currentCategory={currentCategory}
              onPageChange={handlePageChange}
              onHover={setHoveredActivityId}
              onActivityDelete={onActivityDelete}
            />
          </div>
          <div className="w-6/12 fixed top-[144px] right-0 bottom-0">
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

      {/* Mobile Layout */}
      <div className="lg:hidden flex flex-col h-[100dvh]">
        {/* Main Content */}
        <div className="h-full overflow-y-auto">
          <MobileActivityView
            categories={categories}
            currentCategory={currentCategory}
            onCategoryChange={handleCategoryChange}
            onPageChange={handlePageChange}
            onHover={setHoveredActivityId}
            onActivityDelete={onActivityDelete}
            trip={trip}
          />
        </div>

        {/* Map Sheet */}
        <Sheet open={showMap} onOpenChange={setShowMap}>
          <SheetTitle className="sr-only">View Map</SheetTitle>
          <SheetTrigger asChild>
            <Button
              onClick={() => setShowMap(true)}
              className="fixed bottom-6 right-6 rounded-full w-12 h-12 p-0 shadow-lg bg-primary hover:bg-primary/90"
              size="icon"
            >
              <Map className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[100dvh] p-0" closeButtonPosition="left">
            <div className="relative h-full">
              <Button
                onClick={() => setShowMap(false)}
                className="absolute top-4 left-4 z-10 rounded-full w-8 h-8 p-0"
                size="icon"
                variant="secondary"
              >
                <X className="h-4 w-4" />
              </Button>
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
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

export default RecommendationsView;
