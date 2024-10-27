import { Client } from '@googlemaps/google-maps-services-js';
import { NextResponse } from 'next/server';

const client = new Client({});

export async function GET(request: Request, { params }: { params: { placeId: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const maxPhotos = parseInt(searchParams.get('maxPhotos') || '1');

    const placeDetails = await client.placeDetails({
      params: {
        place_id: params.placeId,
        fields: ['photos'],
        key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      },
    });

    const photos =
      placeDetails.data.result.photos?.slice(0, maxPhotos).map(photo => ({
        photoReference: photo.photo_reference,
        width: photo.width,
        height: photo.height,
      })) || [];

    return NextResponse.json({ photos });
  } catch (error) {
    console.error('Error fetching place photos:', error);
    return NextResponse.json({ photos: [] });
  }
}
