import React, { useRef, useState, useCallback, useEffect } from 'react';

import { ActivityRecommendation } from '@prisma/client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useInView } from 'react-intersection-observer';

import { ActivityCard } from './ActivityCard';
import { ActivityShelfType } from '../../types';

// Memoized navigation button
const NavButton = React.memo(
  ({
    direction,
    onClick,
    disabled = false,
  }: {
    direction: 'left' | 'right';
    onClick: () => void;
    disabled?: boolean;
  }) => (
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
  )
);

NavButton.displayName = 'NavButton';

// Separate virtualized card component
const VirtualizedCardWrapper = React.memo(
  ({
    activity,
    onAdd,
  }: {
    activity: ActivityRecommendation;
    onAdd: (activity: ActivityRecommendation) => Promise<void>;
  }) => {
    const { ref, inView } = useInView({
      threshold: 0,
      triggerOnce: true,
    });

    return (
      <div ref={ref} className="flex-shrink-0">
        {inView ? (
          <ActivityCard activity={activity} onAdd={onAdd} />
        ) : (
          <div className="w-72 h-80 bg-gray-100 animate-pulse rounded-xl flex-shrink-0" />
        )}
      </div>
    );
  }
);

VirtualizedCardWrapper.displayName = 'VirtualizedCardWrapper';

interface ActivityShelfProps {
  shelf: ActivityShelfType;
  onAddActivity: (activity: ActivityRecommendation) => Promise<void>;
}

export function ActivityShelf({ shelf, onAddActivity }: ActivityShelfProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  });

  // Throttled scroll handler with RAF
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const hasOverflow = container.scrollWidth > container.clientWidth;
      const isAtStart = container.scrollLeft <= 0;
      const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 1;

      setScrollPosition({
        canScrollLeft: hasOverflow && !isAtStart,
        canScrollRight: hasOverflow && !isAtEnd,
      });
    });
  }, []);

  // Optimized scroll function using container width
  const scroll = useCallback((direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const cardWidth = 288; // 272px card width + 16px gap
    const visibleCards = Math.floor(container.clientWidth / cardWidth);
    const scrollAmount =
      direction === 'left'
        ? -(cardWidth * Math.max(1, visibleCards - 1))
        : cardWidth * Math.max(1, visibleCards - 1);

    container.scrollBy({
      left: scrollAmount,
      behavior: 'smooth',
    });
  }, []);

  // Update scroll buttons on mount and content changes
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(handleScroll);
    });

    resizeObserver.observe(container);
    handleScroll();

    return () => resizeObserver.disconnect();
  }, [handleScroll]);

  if (!shelf.activities?.length) return null;

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold">{shelf.title}</h2>
          <p className="text-md text-gray-600">{shelf.description}</p>
        </div>
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
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
        onScroll={handleScroll}
      >
        {shelf.activities.map(activity => (
          <VirtualizedCardWrapper key={activity.id} activity={activity} onAdd={onAddActivity} />
        ))}
      </div>
    </div>
  );
}

export default React.memo(ActivityShelf);
