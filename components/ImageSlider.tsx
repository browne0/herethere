import React, { useRef, TouchEvent } from 'react';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { CachedImage } from '@/components/CachedImage';

const imageIndexCache = new Map<string, number>();

interface ImageSliderProps {
  images: Array<{ url: string; cdnUrl?: string | null }>;
  alt: string;
  className?: string;
  activityId: string;
}

const ImageSlider: React.FC<ImageSliderProps> = ({ images, alt, className = '', activityId }) => {
  const [currentIndex, setCurrentIndex] = React.useState(() => {
    return imageIndexCache.get(activityId) || 0;
  });

  const [dragOffset, setDragOffset] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const touchStartX = useRef<number>(0);
  const currentOffsetX = useRef<number>(0);
  const minSwipeDistance = 50;

  const updateIndex = (newIndex: number) => {
    setCurrentIndex(newIndex);
    imageIndexCache.set(activityId, newIndex);
  };

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      updateIndex(currentIndex + 1);
    }
    setDragOffset(0);
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      updateIndex(currentIndex - 1);
    }
    setDragOffset(0);
  };

  const goToSlide = (index: number) => {
    updateIndex(index);
    setDragOffset(0);
  };

  const onTouchStart = (e: TouchEvent) => {
    setIsDragging(true);
    touchStartX.current = e.touches[0].clientX;
    currentOffsetX.current = dragOffset;
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;

    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX.current;

    const maxOffset = currentIndex === 0 ? 0 : window.innerWidth;
    const minOffset = currentIndex === images.length - 1 ? 0 : -window.innerWidth;

    let newOffset = currentOffsetX.current + diff;
    if (newOffset > maxOffset) {
      newOffset = maxOffset / 4;
    } else if (newOffset < minOffset) {
      newOffset = minOffset / 4;
    }

    setDragOffset(newOffset);
  };

  const onTouchEnd = () => {
    setIsDragging(false);
    const swipeDistance = dragOffset - currentOffsetX.current;

    if (Math.abs(swipeDistance) > minSwipeDistance) {
      if (swipeDistance < 0 && currentIndex < images.length - 1) {
        goToNext();
      } else if (swipeDistance > 0 && currentIndex > 0) {
        goToPrevious();
      } else {
        setDragOffset(0);
      }
    } else {
      setDragOffset(0);
    }
  };

  if (!images.length) {
    return (
      <div className="relative w-full h-full bg-gray-200 flex items-center justify-center">
        <MapPin className="w-8 h-8 text-gray-400" />
      </div>
    );
  }

  // Calculate the translation for the dots container
  const getDotsTransform = () => {
    if (images.length <= 5) return 'translateX(0)';

    // Each dot is 6px wide with 8px spacing (2px margin on each side)
    const dotWidth = 14; // 6px + 8px

    if (currentIndex <= 2) return 'translateX(0)';
    if (currentIndex >= images.length - 3)
      return `translateX(${-(images.length - 5) * dotWidth}px)`;

    return `translateX(${-(currentIndex - 2) * dotWidth}px)`;
  };

  return (
    <div className={`group relative w-full h-full overflow-hidden ${className}`}>
      <div
        className={`absolute w-full h-full transition-transform ${isDragging ? 'duration-0' : 'duration-300'} ease-out`}
        style={{
          transform: `translateX(${-currentIndex * 100}%) translateX(${dragOffset}px)`,
          cursor: 'default',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {images.map((image, index) => (
          <div
            key={index}
            className="absolute top-0 left-0 w-full h-full"
            style={{ left: `${index * 100}%` }}
          >
            <CachedImage
              photo={image}
              alt={`${alt} - Image ${index + 1}`}
              className="w-full h-full"
            />
          </div>
        ))}
      </div>

      <div className="opacity-0 group-hover:opacity-100">
        {currentIndex > 0 && (
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition-colors z-10"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {currentIndex < images.length - 1 && (
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition-colors z-10"
            aria-label="Next image"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <div
            className="overflow-hidden"
            style={{ width: `${Math.min(images.length, 5) * 14}px` }}
          >
            <div
              className="flex space-x-2 transition-all duration-400"
              style={{
                transform: getDotsTransform(),
                transitionTimingFunction: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
              }}
            >
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-[6px] h-[6px] rounded-full shrink-0 transition-colors ${
                    index === currentIndex ? 'bg-white' : 'bg-white/70'
                  }`}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageSlider;
