import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ActivityCategoryType } from '../../types';

interface CategoryNavigationProps {
  categories: ActivityCategoryType[];
  handleCategoryChange: (categoryType: string) => Promise<void>;
  selectedCategory: ActivityCategoryType['type'];
}

const CategoryNavigation = ({
  categories,
  handleCategoryChange,
  selectedCategory,
}: CategoryNavigationProps) => {
  const [showLeftScroll, setShowLeftScroll] = React.useState(false);
  const [showRightScroll, setShowRightScroll] = React.useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  // Add optimistic state
  const [optimisticCategory, setOptimisticCategory] = React.useState(selectedCategory);

  // Update optimistic state when real state changes
  React.useEffect(() => {
    setOptimisticCategory(selectedCategory);
  }, [selectedCategory]);

  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (container) {
      const hasOverflow = container.scrollWidth > container.clientWidth;
      const isScrolledToEnd =
        container.scrollLeft + container.clientWidth >= container.scrollWidth - 10;
      const isScrolledFromStart = container.scrollLeft > 10;

      setShowRightScroll(hasOverflow && !isScrolledToEnd);
      setShowLeftScroll(hasOverflow && isScrolledFromStart);
    }
  };

  React.useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const handleScroll = () => {
    checkScroll();
  };

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Add optimistic update handler
  const handleOptimisticCategoryChange = async (categoryType: string) => {
    setOptimisticCategory(categoryType);
    await handleCategoryChange(categoryType);
  };

  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        {/* Left scroll button */}
        {showLeftScroll && (
          <div className="absolute left-0 top-0 h-full flex items-center z-20">
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-l from-transparent to-white" />
            <Button
              variant="ghost"
              size="icon"
              className="relative z-10 bg-white shadow-md rounded-full ml-2 h-7 w-7"
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {/* Categories */}
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-4 overflow-x-auto scrollbar-hide w-full px-4"
          onScroll={handleScroll}
        >
          {categories.map(category => (
            <button
              key={category.type}
              onClick={() => handleOptimisticCategoryChange(category.type)}
              className={`flex min-w-[80px] md:min-w-[100px] flex-col items-center justify-center py-4 
                whitespace-nowrap transition-colors flex-shrink-0 relative
                ${
                  optimisticCategory === category.type // Changed to use optimisticCategory
                    ? 'text-black after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-black'
                    : 'text-gray-500 hover:text-black'
                }`}
            >
              {category.icon}
              <span className="capitalize text-xs">{category.type.replace(/-/g, ' ')}</span>
            </button>
          ))}
        </div>

        {/* Right scroll button */}
        {showRightScroll && (
          <div className="absolute right-0 top-0 h-full flex items-center z-20">
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-r from-transparent to-white" />
            <Button
              variant="ghost"
              size="icon"
              className="relative z-10 bg-white shadow-md rounded-full mr-2 h-7 w-7"
              onClick={() => scroll('right')}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryNavigation;
