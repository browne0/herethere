import { Client } from '@googlemaps/google-maps-services-js';
import { NextResponse } from 'next/server';

const client = new Client({});

export async function GET(request: Request, { params }: { params: { reference: string } }) {
  try {
    const photoResponse = await client.placePhoto({
      params: {
        photoreference: params.reference,
        maxwidth: 800, // Adjust based on your needs
        key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      },
      responseType: 'arraybuffer',
    });

    const headers = new Headers();
    headers.set('Content-Type', 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=31536000');

    return new NextResponse(photoResponse.data, {
      headers,
    });
  } catch (error) {
    console.error('Error fetching place photo:', error);
    return new NextResponse(null, { status: 404 });
  }
}
