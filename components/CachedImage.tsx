'use client';

import React, { useState } from 'react';

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

export const CachedImage: React.FC<CachedImageProps> = ({
  photoReference,
  width = 400,
  height = 300,
  alt,
  className = '',
  priority = false,
  quality = 80,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const cdnUrl = `${process.env.NEXT_PUBLIC_CDN_BASE_URL}`;
  const imageKey = `place-${photoReference}-${width}x${height}.jpg`;
  const imageUrl = `${cdnUrl}/${imageKey}`;

  const handleError = async () => {
    if (!error) {
      setError(true);
      try {
        // Attempt to fetch and cache the image
        const response = await fetch('/api/cache-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            photoReference,
            width,
            height,
            quality,
          }),
        });

        if (response.ok) {
          // If caching succeeded, reset error and try loading again
          setError(false);
          // Add a small delay to ensure the CDN has propagated
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (err) {
        console.error('Failed to cache image:', err);
      }
    }
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Show loading skeleton while image loads */}
      {isLoading && (
        <div
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{ height: height || '100%' }}
        />
      )}

      {/* Main image */}
      <Image
        src={error ? '/images/placeholder.jpg' : imageUrl}
        width={width}
        height={height}
        alt={alt}
        className={`
          transition-opacity duration-300
          ${isLoading ? 'opacity-0' : 'opacity-100'}
          ${error ? 'bg-gray-100' : ''}
        `}
        onLoadingComplete={() => setIsLoading(false)}
        onError={handleError}
        priority={priority}
        quality={quality}
      />
    </div>
  );
};
