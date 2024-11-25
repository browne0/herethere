'use client';
import { useRef, useState, useCallback, useEffect } from 'react';

import { ActivityRecommendation } from '@prisma/client';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { ActivityCard } from './ActivityCard';

interface ActivityShelfProps {
  title: string;
  activities: ActivityRecommendation[];
  onAddActivity: (activity: ActivityRecommendation) => Promise<void>;
}

function NavButton({
  direction,
  onClick,
  disabled = false,
}: {
  direction: 'left' | 'right';
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        p-2 rounded-full border border-gray-300
        ${
          disabled
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-600 hover:border-gray-400 hover:bg-gray-50'
        }
        transition-colors duration-200
      `}
      aria-label={`Scroll ${direction}`}
    >
      {direction === 'left' ? (
        <ChevronLeft className="w-4 h-4" />
      ) : (
        <ChevronRight className="w-4 h-4" />
      )}
    </button>
  );
}

export function ActivityShelfComponent({ title, activities, onAddActivity }: ActivityShelfProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  });

  const updateScrollButtons = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const hasOverflow = container.scrollWidth > container.clientWidth;
    const isAtStart = container.scrollLeft <= 0;
    const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 1;

    setScrollPosition({
      canScrollLeft: hasOverflow && !isAtStart,
      canScrollRight: hasOverflow && !isAtEnd,
    });
  }, []);

  const scroll = useCallback(
    (direction: 'left' | 'right') => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const cardWidth = 288; // 272px card + 16px gap
      const scrollAmount = direction === 'left' ? -cardWidth * 2 : cardWidth * 2;

      container.scrollBy({
        left: scrollAmount,
        behavior: 'smooth',
      });

      // Update button states after scrolling
      setTimeout(updateScrollButtons, 300); // After scroll animation
    },
    [updateScrollButtons]
  );

  // Update scroll buttons on mount and content changes
  useEffect(() => {
    updateScrollButtons();
    window.addEventListener('resize', updateScrollButtons);
    return () => window.removeEventListener('resize', updateScrollButtons);
  }, [updateScrollButtons]);

  if (!activities.length) return null;

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="flex gap-2">
          <NavButton
            direction="left"
            onClick={() => scroll('left')}
            disabled={!scrollPosition.canScrollLeft}
          />
          <NavButton
            direction="right"
            onClick={() => scroll('right')}
            disabled={!scrollPosition.canScrollRight}
          />
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
        onScroll={updateScrollButtons}
      >
        {activities.map(activity => (
          <ActivityCard key={activity.id} activity={activity} onAdd={onAddActivity} />
        ))}
      </div>
    </div>
  );
}
