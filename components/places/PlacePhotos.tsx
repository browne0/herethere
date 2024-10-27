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
}

export const PlacePhotos = ({ placeId, className = '', maxPhotos = 1 }: PlacePhotosProps) => {
  const [photos, setPhotos] = useState<PlacePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlacePhotos = async () => {
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

    if (placeId) {
      fetchPlacePhotos();
    }
  }, [placeId, maxPhotos]);

  if (loading) {
    return <Skeleton className={`w-full h-48 rounded-lg ${className}`} />;
  }

  if (error || photos.length === 0) {
    return (
      <div
        className={`w-full h-48 bg-gray-100 flex items-center justify-center rounded-lg ${className}`}
      >
        <p className="text-gray-500">No photos available</p>
      </div>
    );
  }

  return (
    <div className={`grid gap-2 ${photos.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} ${className}`}>
      {photos.map((photo, index) => (
        <div key={index} className="relative aspect-video overflow-hidden rounded-lg">
          <Image
            src={`/api/places/photo/${photo.photoReference}`}
            alt="Place photo"
            className="object-cover"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={index === 0}
          />
        </div>
      ))}
    </div>
  );
};
