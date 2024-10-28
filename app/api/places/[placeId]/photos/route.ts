import { Client, Language } from '@googlemaps/google-maps-services-js';
import { NextResponse } from 'next/server';

if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
  throw new Error('Missing Google Maps API key');
}

const client = new Client({});

export async function GET(request: Request, { params }: { params: { placeId: string } }) {
  try {
    const { placeId } = await params;
    const { searchParams } = new URL(request.url);
    const maxPhotos = parseInt(searchParams.get('maxPhotos') || '1');

    if (!placeId) {
      return new NextResponse('Place ID is required', { status: 400 });
    }

    const placeDetails = await client.placeDetails({
      params: {
        place_id: placeId,
        fields: ['photos', 'name'],
        key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        language: 'en' as Language,
      },
    });

    if (!placeDetails.data.result?.photos?.length) {
      console.log('No photos found for place:', placeId);
      return NextResponse.json({ photos: [] });
    }

    const photos = placeDetails.data.result.photos?.slice(0, maxPhotos).map(photo => ({
      photoReference: photo.photo_reference,
      width: photo.width,
      height: photo.height,
    }));

    return NextResponse.json({ photos });
  } catch (error) {
    console.error('Error fetching place photos:', error);
    return new NextResponse('Failed to fetch place photos', { status: 500 });
  }
}
