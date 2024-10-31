// app/api/directions/route.ts
import { Client, TravelMode } from '@googlemaps/google-maps-services-js';
import { NextResponse } from 'next/server';

const client = new Client();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { origin, destination } = body;

    if (!origin || !destination) {
      return NextResponse.json({ error: 'Origin and destination are required' }, { status: 400 });
    }

    const response = await client.directions({
      params: {
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        mode: TravelMode.driving,
        key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      },
    });

    if (response.data.status === 'OK' && response.data.routes[0]) {
      const route = response.data.routes[0];
      const leg = route.legs[0];

      if (!leg) {
        throw new Error('No route found');
      }

      return NextResponse.json({
        distance: leg.distance?.text,
        duration: leg.duration?.text,
      });
    }

    throw new Error('No route found');
  } catch (error) {
    console.error('Directions API error:', error);
    return NextResponse.json({ error: 'Failed to calculate route' }, { status: 500 });
  }
}
