// components/CachedImage.tsx
'use client';

import { Info } from 'lucide-react';
import Image from 'next/image';
import React from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TooltipPortal } from '@radix-ui/react-tooltip';

export interface ImageUrl {
  url: string;
  cdnUrl?: string | null;
}

interface CachedImageProps {
  photo: ImageUrl | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  author?: { name: string; url: string };
}

export const CachedImage: React.FC<CachedImageProps> = ({
  photo,
  alt,
  className = '',
  sizes = '',
  priority = false,
  author,
}) => {
  if (!photo) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
        <span className="text-gray-400">No image available</span>
      </div>
    );
  }

  // Use CDN URL if available, fallback to direct Google URL
  const imageUrl = photo.cdnUrl || photo.url;

  return (
    <div className="relative w-full h-full">
      <Image
        src={imageUrl}
        fill
        alt={alt}
        className={`${className}`}
        sizes={sizes}
        priority={priority}
        unoptimized
      />
      {author && (
        <div className="absolute bottom-2 right-2 z-10" onClick={e => e.stopPropagation()}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="rounded-full bg-black/0  p-1.5 hover:bg-black/70 transition-colors">
                  <Info className="h-4 w-4 text-white" />
                </button>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent>
                  <p className="text-sm">
                    Photo by{' '}
                    <a
                      href={author.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-blue-500 hover:text-blue-800"
                    >
                      {author.name}
                    </a>
                  </p>
                </TooltipContent>
              </TooltipPortal>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
};
