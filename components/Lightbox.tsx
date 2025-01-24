'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

import { CachedImage } from '@/components/CachedImage';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

interface LightboxProps {
  images: Array<{ url: string; cdnUrl?: string | null }>;
  alt: string;
  className?: string;
}

export function Lightbox({ images, alt, className = '' }: LightboxProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Minimum swipe distance for navigation (in pixels)
  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentImageIndex < images.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    }

    if (isRightSwipe && currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    }

    // Reset touch coordinates
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowLeft':
          setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : prev));
          break;
        case 'ArrowRight':
          setCurrentImageIndex(prev => (prev < images.length - 1 ? prev + 1 : prev));
          break;
        case 'Escape':
          setIsOpen(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, images.length]);

  if (!images.length) return null;

  return (
    <>
      {/* Preview Image */}
      <div
        className={`relative w-full h-full cursor-pointer ${className}`}
        onClick={() => setIsOpen(true)}
      >
        <CachedImage
          photo={images[0]}
          alt={alt}
          className="w-full h-full object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority
        />
        {images.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md text-sm">
            {images.length} photos
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <DialogDescription className="sr-only">
          {`Viewing ${images.length} photos of ${alt}`}
        </DialogDescription>
        <DialogContent
          className="max-w-[100vw] h-[100vh] md:max-w-[90vw] md:h-[90vh] p-0 border-none"
          circleClose
        >
          <div
            className="relative w-full h-full flex items-center justify-center bg-black/95"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Main image */}
            <div className="relative w-full h-full">
              <CachedImage
                photo={images[currentImageIndex]}
                alt={`${alt} - Image ${currentImageIndex + 1}`}
                className="w-full h-full object-scale-down"
                sizes="90vw"
              />
            </div>

            {/* Navigation buttons */}
            {currentImageIndex > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 text-black bg-white/90 hover:bg-white shadow-md"
                onClick={() => setCurrentImageIndex(prev => prev - 1)}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}
            {currentImageIndex < images.length - 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 text-black bg-white/90 hover:bg-white shadow-md"
                onClick={() => setCurrentImageIndex(prev => prev + 1)}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            )}

            {/* Image counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 text-black px-3 py-1.5 rounded-full text-sm font-medium shadow-md">
              {currentImageIndex + 1} / {images.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
