'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface CachedImageProps {
  photoReference: string;
  width?: number;
  height?: number;
  alt: string;
  className?: string;
  priority?: boolean;
  quality?: number;
}

interface CacheResponse {
  success: boolean;
  url: string;
  message: string;
  error?: string;
}

export const CachedImage: React.FC<CachedImageProps> = ({
  photoReference,
  width = 800,
  height = 533,
  alt,
  className = '',
  priority = false,
  quality = 80,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const cacheImage = async () => {
      if (!photoReference) {
        setError(true);
        return;
      }

      try {
        const response = await fetch('/api/cache-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            photoReference,
            width,
            height,
          }),
        });

        const data: CacheResponse = await response.json();

        if (!data.success || !data.url) {
          throw new Error(data.error || 'Failed to cache image');
        }

        setImageUrl(data.url);
      } catch (err) {
        console.error('Error caching image:', err);
        // Fallback to direct Google URL if caching fails
        setImageUrl(
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${width}&photo_reference=${photoReference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
        );
      }
    };

    cacheImage();
  }, [photoReference, width, height]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Loading skeleton */}
      {isLoading && (
        <div
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{ height: height || '100%' }}
        />
      )}

      {/* Main image */}
      {imageUrl && (
        <Image
          src={imageUrl}
          fill
          alt={alt}
          className={`
            transition-opacity duration-300
            ${isLoading ? 'opacity-0' : 'opacity-100'}
            ${error ? 'bg-gray-100' : ''}
            object-cover
          `}
          onLoad={() => setIsLoading(false)}
          onError={() => setError(true)}
          priority={priority}
          unoptimized // Important: bypass Next.js image optimization for external URLs
        />
      )}

      {/* Error state */}
      {error && !imageUrl && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <span className="text-gray-400">Image not available</span>
        </div>
      )}
    </div>
  );
};
