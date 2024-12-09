// components/CachedImage.tsx
'use client';

import React from 'react';

import Image from 'next/image';

export interface ImageUrl {
  url: string;
  cdnUrl?: string | null;
}

interface CachedImageProps {
  images: { urls: ImageUrl[] };
  index?: number;
  alt: string;
  className?: string;
  priority?: boolean;
}

export const CachedImage: React.FC<CachedImageProps> = ({
  images,
  index = 0,
  alt,
  className = '',
  priority = false,
}) => {
  const photo = images.urls[index];
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
    <Image
      src={imageUrl}
      fill
      alt={alt}
      className={`object-cover ${className}`}
      unoptimized
      loading="eager"
    />
  );
};
