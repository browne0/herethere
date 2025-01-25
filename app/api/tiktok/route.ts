import { prisma } from '@/lib/db';
import { EDClient } from 'ensembledata';
import { NextRequest, NextResponse } from 'next/server';

const client = new EDClient({ token: process.env.ENSEMBLEDATA_API_KEY! });

export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const placeName = searchParams.get('name');
    const activityId = searchParams.get('activityId');
    const city = searchParams.get('city');
    const country = searchParams.get('country');

    if (!placeName) {
      return NextResponse.json({ error: 'Place name is required' }, { status: 400 });
    }

    if (!country) {
      return NextResponse.json({ error: 'Country is required' }, { status: 400 });
    }

    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    if (!process.env.ENSEMBLEDATA_API_KEY) {
      return NextResponse.json({ error: 'Missing Tiktok reference API key' }, { status: 400 });
    }

    console.log(placeName, city, country);

    const result = await client.tiktok.keywordSearch({
      keyword: `${placeName} ${city}`,
      period: '0',
    });

    if (result.data) {
      console.log('unitsCharged', result.unitsCharged);
      const posts = result.data.data || [];

      // Map to simplified video objects
      const mappedVideos = posts.map((video: any) => ({
        video_id: video.aweme_info.aweme_id,
        like_count: video.aweme_info.statistics.digg_count,
        share_count: video.aweme_info.statistics.share_count,
        play_count: video.aweme_info.statistics.play_count,
      }));

      // Update activity recommendation in database
      await prisma.activityRecommendation.update({
        where: { id: activityId },
        data: {
          tiktokVideos: mappedVideos,
          lastTikTokSync: new Date(),
        },
      });

      return NextResponse.json(mappedVideos);
    } else {
      return NextResponse.json(
        { error: (result as any).detail },
        { status: (result as any).detail.statusCode }
      );
    }
  } catch (error) {
    console.error('[ENSEMBLEDATA_GET_VIDEOS]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
