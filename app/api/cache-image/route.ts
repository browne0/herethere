// app/api/cache-image/route.ts
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Helper to check if image already exists in S3
async function checkImageExists(key: string): Promise<boolean> {
  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: process.env.CDN_BUCKET_NAME!,
        Key: key,
      })
    );
    return true;
  } catch (_error) {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    // Optional: Check authentication
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Parse request body
    const { photoReference, width = 400, height = 300, quality = 80 } = await request.json();

    if (!photoReference) {
      return NextResponse.json({ error: 'Photo reference is required' }, { status: 400 });
    }

    // Generate consistent key for the image
    const imageKey = `place-${photoReference}-${width}x${height}.jpg`;

    // Check if image already exists
    const exists = await checkImageExists(imageKey);
    if (exists) {
      return NextResponse.json({
        success: true,
        message: 'Image already cached',
        url: `${process.env.CDN_BASE_URL}/${imageKey}`,
      });
    }

    // Fetch image from Google Places API
    const googleUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${width}&photoreference=${photoReference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;

    const imageResponse = await fetch(googleUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image from Google: ${imageResponse.statusText}`);
    }

    // Get image buffer
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Upload to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.CDN_BUCKET_NAME!,
        Key: imageKey,
        Body: imageBuffer,
        ContentType: 'image/jpeg',
        CacheControl: 'public, max-age=31536000', // Cache for 1 year
        Metadata: {
          'photo-reference': photoReference,
          'original-width': width.toString(),
          'original-height': height.toString(),
          quality: quality.toString(),
        },
      })
    );

    // Return success with CDN URL
    return NextResponse.json({
      success: true,
      message: 'Image cached successfully',
      url: `${process.env.CDN_BASE_URL}/${imageKey}`,
    });
  } catch (error) {
    console.error('Error caching image:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

// Optional: Add HEAD endpoint to check if image is cached
export async function HEAD(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const photoReference = searchParams.get('ref');
    const width = searchParams.get('w') || '400';
    const height = searchParams.get('h') || '300';

    if (!photoReference) {
      return new NextResponse(null, { status: 400 });
    }

    const imageKey = `place-${photoReference}-${width}x${height}.jpg`;
    const exists = await checkImageExists(imageKey);

    return new NextResponse(null, {
      status: exists ? 200 : 404,
    });
  } catch (_error) {
    return new NextResponse(null, { status: 500 });
  }
}
