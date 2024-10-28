interface PlacesSearchParams {
  query: string;
  locationBias?: string;
}

interface PhotoParams {
  placeId: string;
  maxPhotos?: number;
}

export async function searchPlaces({ query, locationBias }: PlacesSearchParams) {
  const response = await fetch('/api/places', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, locationBias }),
  });

  if (!response.ok) {
    throw new Error('Failed to search places');
  }

  return response.json();
}

export async function getPlaceDetails(placeId: string) {
  const response = await fetch(`/api/places/${placeId}/details`);

  if (!response.ok) {
    throw new Error('Failed to fetch place details');
  }

  return response.json();
}

export async function getPlacePhotos({ placeId, maxPhotos = 1 }: PhotoParams) {
  const response = await fetch(`/api/places/${placeId}/photos?maxPhotos=${maxPhotos}`);

  if (!response.ok) {
    throw new Error('Failed to fetch place photos');
  }

  return response.json();
}

export function getPhotoUrl(reference: string, maxWidth = 800) {
  return `/api/places/photo/${reference}?maxWidth=${maxWidth}`;
}
