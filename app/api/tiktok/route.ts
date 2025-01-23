import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { EnsembleDataResponse } from './types';

function placeToHashtag(placeName: string) {
  // Remove location after hyphen/dash
  const nameOnly = placeName.split(/\s*[-–—]\s*/)[0].trim();

  // Normalize characters (é -> e, ü -> u, etc)
  const normalized = nameOnly.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Remove diacritics

  return (
    '#' +
    normalized
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, '') // Remove spaces
      .toLowerCase()
  ); // Convert to lowercase
}

export async function GET(request: NextRequest) {
  // Function to fetch a single page of results
  async function fetchTiktokPage(cursor: number, name: string) {
    if (!process.env.ENSEMBLEDATA_API_KEY) {
      throw new Error('Missing Tiktok reference API key');
    }

    const tiktokSearchParams = new URLSearchParams({
      name,
      token: process.env.ENSEMBLEDATA_API_KEY,
      cursor: cursor.toString(),
    });

    const response = await fetch(
      `https://ensembledata.com/apis/tt/hashtag/posts?${tiktokSearchParams.toString()}`,
      {
        headers: {
          accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch from Ensemble Data API: ${response.status}`);
    }

    return (await response.json()) as EnsembleDataResponse;
  }

  try {
    const searchParams = new URL(request.url).searchParams;
    const placeName = searchParams.get('name');
    const activityId = searchParams.get('activityId');

    if (!placeName) {
      return NextResponse.json({ error: 'Place name is required' }, { status: 400 });
    }

    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
    }

    if (!process.env.ENSEMBLEDATA_API_KEY) {
      return NextResponse.json({ error: 'Missing Tiktok reference API key' }, { status: 400 });
    }

    const name = placeToHashtag(placeName);

    // Fetch two pages of results
    const [page1, page2] = await Promise.all([fetchTiktokPage(0, name), fetchTiktokPage(20, name)]);

    // Add null checks and provide fallbacks
    const videos1 =
      page1?.data?.data.filter(video => {
        return (
          video?.statistics?.play_count > 0 && // Has views
          !video?.status?.is_delete && // Not deleted
          !video?.status?.is_prohibited && // Not banned
          !video?.status?.is_private && // Not private
          !video?.status?.in_reviewing // Not under review
        );
      }) || [];
    const videos2 =
      page2?.data?.data.filter(video => {
        return (
          video?.statistics?.play_count > 0 && // Has views
          !video?.status?.is_delete && // Not deleted
          !video?.status?.is_prohibited && // Not banned
          !video?.status?.is_private && // Not private
          !video?.status?.in_reviewing // Not under review
        );
      }) || [];

    // Combine and filter English videos only, then sort
    const sortedVideos = [...videos1, ...videos2]
      .filter(video => video?.author?.language === 'en')
      .sort((a, b) => {
        // First compare digg_count
        if (b.statistics.digg_count !== a.statistics.digg_count) {
          return b.statistics.digg_count - a.statistics.digg_count;
        }
        // If digg_count is equal, compare play_count
        if (b.statistics.play_count !== a.statistics.play_count) {
          return b.statistics.play_count - a.statistics.play_count;
        }
        // If play_count is equal, compare share_count
        return b.statistics.share_count - a.statistics.share_count;
      })
      .slice(0, 20); // Take only top 20 videos

    // Map to simplified video objects
    const mappedVideos = sortedVideos.map(video => ({
      video_id: video.statistics.aweme_id,
      like_count: video.statistics.digg_count,
      share_count: video.statistics.share_count,
      play_count: video.statistics.play_count,
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
  } catch (error) {
    console.error('[ENSEMBLEDATA_GET_VIDEOS]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
