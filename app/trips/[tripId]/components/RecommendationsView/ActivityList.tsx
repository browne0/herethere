import { Bookmark, Calendar, Info, ListChecks, X } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useActivitiesStore } from '@/lib/stores/activitiesStore';

import { ActivityCategoryType } from '../../types';
import { ActivitySheet } from '../ActivitySheet';
import ActivityCard from './ActivityCard';

interface ActivityListProps {
  currentCategory?: ActivityCategoryType;
  onPageChange: (page: number) => void;
  onHover: (id: string | null) => void;
}

const ActivityList = ({ currentCategory, onPageChange, onHover }: ActivityListProps) => {
  const { trip } = useActivitiesStore();
  const addedCount = trip?.activities.filter(act => act.status === 'planned').length ?? 0;
  const interestedCount = trip?.activities.filter(act => act.status === 'interested').length ?? 0;

  const [hasSeenBanner, setHasSeenBanner] = useLocalStorage(
    'has-seen-recommendations-banner',
    false
  );

  const PaginationComponent = () => {
    if (!currentCategory) return null;

    const { currentPage, totalPages } = currentCategory.pagination;

    return (
      <div className="bg-white border-t relative">
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
      </div>
    );
  };

  if (!currentCategory) return null;

  const shouldShowBanner = currentCategory.type === 'for-you' && !hasSeenBanner;

  return (
    <div className="relative overflow-y-auto h-[calc(100vh-144px)]">
      <div className="bg-white border-b px-4 py-3 hidden lg:flex items-center justify-between sticky top-0 z-20">
        <div className="flex divide-x">
          <div className="flex items-center gap-2 pr-4 ">
            <ListChecks className="w-5 h-5 text-green-600" />
            <span className="text-sm">
              <span className="font-medium">{addedCount}</span>{' '}
              {addedCount === 1 ? 'activity' : 'activities'} added
            </span>
          </div>
          <div className="flex items-center gap-2 pl-4">
            <Bookmark
              className="h-5 w-5 text-yellow-300 fill-yellow-300"
              stroke="black"
              strokeWidth={1.5}
            />
            <span className="text-sm">
              <span className="font-medium">{interestedCount} saved for later</span>
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                View Activities
              </Button>
            </SheetTrigger>
            <ActivitySheet />
          </Sheet>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    asChild={addedCount > 0}
                    variant="default"
                    size="sm"
                    disabled={addedCount === 0}
                  >
                    {addedCount > 0 ? (
                      <Link href={`/trips/${trip?.id}/itinerary`}>
                        <Calendar className="w-4 h-4" />
                        View Itinerary
                      </Link>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        View Itinerary
                      </span>
                    )}
                  </Button>
                </div>
              </TooltipTrigger>
              {addedCount === 0 && (
                <TooltipContent side="bottom">
                  <p>Add activities to view your itinerary</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      {shouldShowBanner && (
        <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 m-4 relative">
          <button
            onClick={() => {
              setHasSeenBanner(true);
              localStorage.setItem('has-seen-recommendations-banner', 'true');
            }}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close banner"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="font-medium text-gray-900 flex items-center">
            <Info className="w-4 h-4 mr-2 inline" />
            <span>Personalized Recommendations</span>
          </h3>
          <p className="text-gray-500 text-sm">
            We've curated these activities based on your preferences. Add them to your trip and
            we'll create an optimized itinerary.
          </p>
        </div>
      )}

      <div className="py-4 ml-4">
        <h2 className="text-2xl font-semibold">{currentCategory.title}</h2>
        <p className="text-md text-gray-600">{currentCategory.description}</p>
      </div>

      {currentCategory.activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-gray-500 text-lg">No activities found for this category.</p>
        </div>
      ) : (
        <div className="px-4 grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 pb-8">
          {currentCategory.activities.map(activity => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              category={currentCategory}
              onHover={onHover}
            />
          ))}
        </div>
      )}

      {currentCategory.pagination && <PaginationComponent />}
    </div>
  );
};

export default ActivityList;
