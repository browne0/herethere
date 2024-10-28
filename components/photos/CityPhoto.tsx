'use client';
import { useEffect, useState } from 'react';

import Image from 'next/image';

import { searchPlaces, getPlacePhotos, getPhotoUrl } from '@/lib/places';

interface CityPhotoProps {
  city: string;
  className?: string;
}

export function CityPhoto({ city, className = '' }: CityPhotoProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCityPhoto = async () => {
      try {
        setLoading(true);

        // First, search for the city to get its place ID
        const searchResponse = await searchPlaces({
          query: `${city} city`,
          // No locationBias here since we want the main city result
        });

        if (!searchResponse.candidates?.[0]?.place_id) {
          throw new Error('City not found');
        }

        // Get the photos for the city
        const { photos } = await getPlacePhotos({
          placeId: searchResponse.candidates[0].place_id,
          maxPhotos: 1,
        });

        if (photos.length === 0) {
          throw new Error('No photos available');
        }

        // Get the photo URL
        const url = getPhotoUrl(photos[0].photoReference, 1600); // Larger width for header image
        setPhotoUrl(url);
      } catch (err) {
        console.error('Error fetching city photo:', err);
        setError(err instanceof Error ? err.message : 'Failed to load city photo');
      } finally {
        setLoading(false);
      }
    };

    if (city) {
      fetchCityPhoto();
    }
  }, [city]);

  if (loading) {
    return (
      <div className={`relative h-48 md:h-64 bg-muted animate-pulse ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60" />
      </div>
    );
  }

  if (error || !photoUrl) {
    return (
      <div className={`relative h-48 md:h-64 bg-muted ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60" />
      </div>
    );
  }

  return (
    <div className={`relative h-48 md:h-64 ${className}`}>
      <Image src={photoUrl} alt={`${city} cityscape`} fill className="object-cover" priority />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60" />
    </div>
  );
}
