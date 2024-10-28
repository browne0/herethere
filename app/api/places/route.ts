import { Client } from '@googlemaps/google-maps-services-js';
import type { PlaceInputType, Language } from '@googlemaps/google-maps-services-js';
import { NextResponse } from 'next/server';

if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
  throw new Error('Missing Google Maps API key');
}

const googleMapsClient = new Client({});

// POST for search since we're sending search criteria in body
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, locationBias } = body;

    const response = await googleMapsClient.findPlaceFromText({
      params: {
        input: query,
        inputtype: 'textquery' as PlaceInputType,
        locationbias: locationBias,
        fields: ['place_id', 'formatted_address', 'geometry', 'photos', 'name'],
        key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        language: 'en' as Language,
      },
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Places search error:', error);
    return new NextResponse('Failed to search places', { status: 500 });
  }
}
