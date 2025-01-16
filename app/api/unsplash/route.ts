import { NextRequest, NextResponse } from 'next/server';
import { UnsplashClient } from './UnsplashClient';

const unsplashApi = UnsplashClient.getInstance();

export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const cityName = searchParams.get('cityName');

    if (!cityName) {
      return NextResponse.json({ error: 'City name is required' }, { status: 400 });
    }

    const unsplashResponse = await unsplashApi.photos.getRandom({
      query: cityName,
      orientation: 'landscape',
    });

    if (unsplashResponse.type === 'error') {
      return NextResponse.json(
        { error: `Unsplash API error: ${unsplashResponse.errors}` },
        { status: 500 }
      );
    }

    return NextResponse.json(unsplashResponse.response);
  } catch (error) {
    console.error('[UNSPLASH_GET_PHOTOS]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
