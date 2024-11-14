import { AddressType, Client, Language } from '@googlemaps/google-maps-services-js';
import { NextResponse } from 'next/server';

import { ACTIVITY_CATEGORIES } from '@/lib/types/activities';

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
        fields: [
          'name',
          'formatted_address',
          'geometry',
          'photos',
          'types',
          'opening_hours',
          'price_level',
          'rating',
          'user_ratings_total',
        ],
        key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        language: Language.en,
      },
    });

    const placeTypes: AddressType[] = response.data.result.types || [];

    // Find matching category based on place types
    const matchedCategory = Object.entries(ACTIVITY_CATEGORIES).find(([_, category]) =>
      placeTypes.some(placeType => category.googlePlaceTypes.includes(placeType))
    );

    // Find the first matching place type for more specific categorization
    const matchedPlaceType = placeTypes.find(type =>
      matchedCategory?.[1].googlePlaceTypes.includes(type)
    );

    return NextResponse.json({
      ...response.data.result,
      category: matchedCategory?.[0] || null,
      placeType: matchedPlaceType || null,
    });
  } catch (error) {
    console.error('Place details error:', error);
    return new NextResponse('Failed to fetch place details', { status: 500 });
  }
}
