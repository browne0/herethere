// app/api/cache-image/route.ts
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Helper to check if image exists in S3
async function checkImageExists(key: string): Promise<boolean> {
  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: process.env.CDN_BUCKET_NAME!,
        Key: key,
      })
    );
    return true;
  } catch (error) {
    return false;
  }
}

// Helper to generate image key
function generateImageKey(photoReference: string, width: number, height: number): string {
  // Create a clean filename from the photo reference
  const cleanReference = photoReference.replace(/[^a-zA-Z0-9]/g, '-');
  return `places/${cleanReference}-${width}x${height}.jpg`;
}

export async function POST(request: Request) {
  try {
    // Parse request body
    const { photoReference, width = 800, height = 600 } = await request.json();

    if (!photoReference) {
      return NextResponse.json({ error: 'Photo reference is required' }, { status: 400 });
    }

    // Generate the image key
    const imageKey = generateImageKey(photoReference, width, height);

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
    const googleUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${width}&photo_reference=${photoReference}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

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
