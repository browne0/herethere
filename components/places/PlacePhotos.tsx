'use client';
import { useState, useEffect } from 'react';

import Image from 'next/image';

import { Skeleton } from '@/components/ui/skeleton';

interface PlacePhoto {
  photoReference: string;
  width: number;
  height: number;
}

interface PlacePhotosProps {
  placeId: string;
  className?: string;
  maxPhotos?: number;
  aspectRatio?: 'square' | 'video';
}

export const PlacePhotos = ({
  placeId,
  className = '',
  maxPhotos = 1,
  aspectRatio = 'square',
}: PlacePhotosProps) => {
  const [photos, setPhotos] = useState<PlacePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlacePhotos = async () => {
      if (!placeId) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/places/${placeId}/photos?maxPhotos=${maxPhotos}`);
        if (!response.ok) throw new Error('Failed to fetch photos');
        const data = await response.json();
        setPhotos(data.photos);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load photos');
      } finally {
        setLoading(false);
      }
    };

    fetchPlacePhotos();
  }, [placeId, maxPhotos]);

  if (loading) {
    return (
      <div className={`relative bg-muted ${className}`}>
        <div className="absolute inset-0 animate-pulse bg-muted-foreground/10" />
      </div>
    );
  }

  if (error || photos.length === 0) {
    return (
      <div className={`bg-muted flex items-center justify-center ${className}`}>
        <div className="text-sm text-muted-foreground">No photo available</div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={`/api/places/photo/${photos[0].photoReference}`}
        alt="Place photo"
        className="object-cover transition-transform group-hover:scale-105"
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority
      />
    </div>
  );
};
