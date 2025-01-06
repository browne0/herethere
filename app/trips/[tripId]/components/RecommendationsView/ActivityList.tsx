import React from 'react';

import { Info } from 'lucide-react';

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { cn } from '@/lib/utils';

import ActivityCard from './ActivityCard';
import { ActivityCategoryType } from '../../types';

interface ActivityListProps {
  currentCategory?: ActivityCategoryType;
  onPageChange: (page: number) => void;
  onHover: (id: string | null) => void;
}

const ActivityList = ({ currentCategory, onPageChange, onHover }: ActivityListProps) => {
  const PaginationComponent = () => {
    if (!currentCategory) return null;

    const { currentPage, totalPages } = currentCategory.pagination;

    return (
      <div className="bg-white border-t py-4 px-2 h-full relative">
        <Pagination>
          <PaginationContent className="flex justify-center items-center gap-2">
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={e => {
                  e.preventDefault();
                  onPageChange(currentPage - 1);
                }}
                className={cn({
                  'pointer-events-none opacity-50': currentPage === 1,
                })}
              />
            </PaginationItem>

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={e => {
                  e.preventDefault();
                  onPageChange(currentPage + 1);
                }}
                className={cn({
                  'pointer-events-none opacity-50': currentPage === totalPages,
                })}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    );
  };

  if (!currentCategory) return null;

  return (
    <>
      <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 m-4">
        <h3 className="font-medium text-gray-900 flex items-center">
          <Info className="w-4 h-4 mr-2 inline" />
          <span>Personalized Recommendations</span>
        </h3>
        <p className="text-gray-500 text-sm">
          We've curated these activities based on your preferences. Add them to your trip and we'll
          create an optimized itinerary.
        </p>
      </div>

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
    </>
  );
};

export default ActivityList;
