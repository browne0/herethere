import { Client } from '@googlemaps/google-maps-services-js';
import type { PlaceInputType, Language } from '@googlemaps/google-maps-services-js';
import { NextResponse } from 'next/server';

if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
  throw new Error('Missing Google Maps API key');
}

const googleMapsClient = new Client({});
export async function GET(request: Request, { params }: { params: { placeId: string } }) {
  try {
    const { placeId } = await params;
    const response = await googleMapsClient.placeDetails({
      params: {
        place_id: placeId,
        fields: ['name', 'formatted_address', 'geometry', 'photos', 'types', 'opening_hours'],
        key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        language: 'en' as Language,
      },
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Place details error:', error);
    return new NextResponse('Failed to fetch place details', { status: 500 });
  }
}
