'use client';
import { useState, useEffect } from 'react';

import { ImageIcon } from 'lucide-react';
import Image from 'next/image';

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
      if (!placeId) {
        setError('No place ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/places/${placeId}/photos?maxPhotos=${maxPhotos}`);

        if (!response.ok) {
          throw new Error('Failed to fetch photos');
        }

        const data = await response.json();
        console.log('Photos data:', data); // Debug log
        setPhotos(data.photos || []);
      } catch (err) {
        console.error('Error fetching photos:', err);
        setError(err instanceof Error ? err.message : 'Failed to load photos');
      } finally {
        setLoading(false);
      }
    };

    fetchPlacePhotos();
  }, [placeId, maxPhotos]);

  if (loading) {
    return (
      <div
        className={`relative bg-muted ${className} ${
          aspectRatio === 'square' ? 'aspect-square' : 'aspect-video'
        }`}
      >
        <div className="absolute inset-0 animate-pulse bg-muted-foreground/10" />
      </div>
    );
  }

  if (error || photos.length === 0) {
    return (
      <div
        className={`bg-muted flex items-center justify-center ${className} ${
          aspectRatio === 'square' ? 'aspect-square' : 'aspect-video'
        }`}
      >
        <div className="flex flex-col items-center gap-2">
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">No photo available</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${className} ${
        aspectRatio === 'square' ? 'aspect-square' : 'aspect-video'
      }`}
    >
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
