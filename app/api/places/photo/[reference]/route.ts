import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: { reference: string } }) {
  try {
    const { reference } = await params;

    if (!reference) {
      return new NextResponse('Photo reference is required', { status: 400 });
    }

    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${reference}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(photoUrl);

    if (!response.ok) {
      throw new Error('Failed to fetch photo');
    }

    // Create headers for the response
    const headers = new Headers();
    headers.set('Content-Type', response.headers.get('Content-Type') || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

    // Return the photo with appropriate headers
    return new Response(response.body, {
      headers,
      status: 200,
    });
  } catch (error) {
    console.error('Error fetching photo:', error);
    return new NextResponse('Failed to fetch photo', { status: 500 });
  }
}
