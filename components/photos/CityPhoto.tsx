// components/photos/CityPhoto.tsx

'use client';
import { useEffect, useState } from 'react';

import { MapPin } from 'lucide-react';
import Image from 'next/image';

import { searchPlaces, getPlacePhotos, getPhotoUrl } from '@/lib/places';

interface CityPhotoProps {
  city: string;
  placeId?: string | null;
  className?: string;
  useUnsplashFallback?: boolean;
  height?: 'auto' | 'small' | 'medium' | 'large';
  showLoadingState?: boolean;
}

const heightClasses = {
  auto: '',
  small: 'h-48',
  medium: 'h-48 md:h-64',
  large: 'h-64 md:h-96',
};

export function CityPhoto({
  city,
  placeId,
  className = '',
  useUnsplashFallback = true,
  height = 'medium',
  showLoadingState = true,
}: CityPhotoProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPhoto = async () => {
      try {
        setLoading(true);
        let photoReference: string | null = null;

        // If we have a placeId, try to get photos directly
        if (placeId) {
          const { photos } = await getPlacePhotos({
            placeId,
            maxPhotos: 1,
          });
          if (photos.length > 0) {
            photoReference = photos[0].photoReference;
          }
        }

        // If no placeId or no photos found, search for the city
        if (!photoReference) {
          const searchResponse = await searchPlaces({
            query: `${city} city`,
          });

          if (searchResponse.candidates?.[0]?.place_id) {
            const { photos } = await getPlacePhotos({
              placeId: searchResponse.candidates[0].place_id,
              maxPhotos: 1,
            });
            if (photos.length > 0) {
              photoReference = photos[0].photoReference;
            }
          }
        }

        // If we found a photo from Places API, use it
        if (photoReference) {
          const url = getPhotoUrl(photoReference, 1600);
          setPhotoUrl(url);
        }
        // Try Unsplash as fallback if enabled
        else if (useUnsplashFallback) {
          const response = await fetch(`/api/photos/city?city=${encodeURIComponent(city)}`);
          const data = await response.json();
          if (data.photoUrl) {
            setPhotoUrl(data.photoUrl);
          } else {
            throw new Error('No photos available');
          }
        } else {
          throw new Error('No photos available');
        }
      } catch (err) {
        console.error('Error fetching city photo:', err);
        setError(err instanceof Error ? err.message : 'Failed to load city photo');
      } finally {
        setLoading(false);
      }
    };

    if (city) {
      fetchPhoto();
    }
  }, [city, placeId, useUnsplashFallback]);

  const heightClass = heightClasses[height];
  const containerClasses = `relative ${heightClass} ${className}`;

  if (loading && showLoadingState) {
    return (
      <div className={`${containerClasses} bg-muted animate-pulse`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <MapPin className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60" />
      </div>
    );
  }

  if (error || !photoUrl) {
    return (
      <div className={`${containerClasses} bg-muted`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <MapPin className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60" />
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      <Image
        src={photoUrl}
        alt={`${city} cityscape`}
        fill
        className="object-cover"
        priority
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60" />
    </div>
  );
}
