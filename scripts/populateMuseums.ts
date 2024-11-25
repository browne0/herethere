import {
  AddressType,
  Client as GoogleMapsClient,
  PlacesNearbyRanking,
} from '@googlemaps/google-maps-services-js';
import { Prisma, PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: ['.env.local'] });

const prisma = new PrismaClient();
const googleMapsClient = new GoogleMapsClient({});

// Museum-specific quality thresholds
const QUALITY_THRESHOLDS = {
  MIN_RATING: 4.2,
  MIN_REVIEWS: 750,
  EXCEPTIONAL_RATING: 4.6,
  EXCEPTIONAL_REVIEWS: 3000,
};

// Focus on museum areas
const NYC_MUSEUM_AREAS = [
  {
    name: 'Museum Mile',
    location: { lat: 40.7794, lng: -73.9632 },
    radius: 2000, // Covers most of Museum Mile
  },
  {
    name: 'Midtown Museums',
    location: { lat: 40.7614, lng: -73.9776 },
    radius: 1500, // Covers MoMA area
  },
  {
    name: 'Lower Manhattan Museums',
    location: { lat: 40.7127, lng: -74.0134 },
    radius: 1500, // Covers downtown museums
  },
  {
    name: 'West Side Museums',
    location: { lat: 40.7744, lng: -73.9741 },
    radius: 1500, // Natural History Museum area
  },
];

// Only museum types we care about
const MUSEUM_TYPES = [AddressType.museum, AddressType.art_gallery] as const;

function validateMuseum(place: any): boolean {
  // Must have basic required fields
  if (!place?.name || !place?.geometry?.location) {
    console.log(`Skipping ${place?.name || 'unnamed'} - missing basic details`);
    return false;
  }

  // Must have ratings that meet museum thresholds
  if (!place.rating || !place.user_ratings_total) {
    console.log(`Skipping ${place.name} - missing ratings`);
    return false;
  }

  const isExceptional =
    place.rating >= QUALITY_THRESHOLDS.EXCEPTIONAL_RATING &&
    place.user_ratings_total >= QUALITY_THRESHOLDS.EXCEPTIONAL_REVIEWS;

  const meetsMinimumQuality =
    place.rating >= QUALITY_THRESHOLDS.MIN_RATING &&
    place.user_ratings_total >= QUALITY_THRESHOLDS.MIN_REVIEWS;

  if (!isExceptional && !meetsMinimumQuality) {
    console.log(`Skipping ${place.name} - doesn't meet museum quality thresholds`);
    return false;
  }

  // Must have photos
  if (!place.photos || place.photos.length === 0) {
    console.log(`Skipping ${place.name} - no photos`);
    return false;
  }

  return true;
}

async function populateMuseumsAndGalleries(cityId: string) {
  const city = await prisma.city.findUnique({
    where: { id: cityId },
  });

  if (!city) {
    throw new Error(`City with ID ${cityId} not found`);
  }

  console.log(`Starting museums and galleries sync for ${city.name}...`);

  const stats = {
    processed: 0,
    added: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    byArea: {} as Record<string, number>,
  };

  const processedPlaceIds = new Set<string>();

  for (const area of NYC_MUSEUM_AREAS) {
    console.log(`\nSearching in ${area.name}...`);
    stats.byArea[area.name] = 0;

    for (const placeType of MUSEUM_TYPES) {
      try {
        const response = await googleMapsClient.placesNearby({
          params: {
            key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
            location: area.location,
            radius: area.radius,
            type: placeType,
            rankby: PlacesNearbyRanking.prominence,
          },
        });

        for (const place of response.data.results) {
          stats.processed++;
          const placeId = place.place_id!;

          // Skip if already processed
          if (processedPlaceIds.has(placeId)) {
            continue;
          }
          processedPlaceIds.add(placeId);

          try {
            const details = await googleMapsClient.placeDetails({
              params: {
                key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
                place_id: placeId,
                fields: [
                  'name',
                  'formatted_address',
                  'geometry',
                  'photo',
                  'type',
                  'opening_hours',
                  'rating',
                  'user_ratings_total',
                  'price_level',
                  'editorial_summary',
                ],
              },
            });

            const placeDetails = { ...details.data.result, place_id: placeId };

            // Validate museum/gallery
            if (!validateMuseum(placeDetails)) {
              stats.skipped++;
              continue;
            }

            // Museum-specific data preparation
            const activityData: Prisma.ActivityRecommendationCreateInput = {
              name: placeDetails.name,
              description:
                placeDetails.editorial_summary?.overview ||
                `Visit ${placeDetails.name}, a cultural institution in ${city.name}.`,
              city: { connect: { id: city.id } },

              rating: placeDetails.rating,
              ratingTier:
                placeDetails.rating >= QUALITY_THRESHOLDS.EXCEPTIONAL_RATING
                  ? 'EXCEPTIONAL'
                  : placeDetails.rating >= QUALITY_THRESHOLDS.MIN_RATING
                    ? 'HIGH'
                    : 'AVERAGE',
              reviewCount: placeDetails.user_ratings_total,
              reviewCountTier:
                placeDetails.user_ratings_total >= QUALITY_THRESHOLDS.EXCEPTIONAL_REVIEWS
                  ? 'VERY_HIGH'
                  : placeDetails.user_ratings_total >= QUALITY_THRESHOLDS.MIN_REVIEWS
                    ? 'HIGH'
                    : 'MODERATE',

              isMustSee:
                placeDetails.rating >= QUALITY_THRESHOLDS.EXCEPTIONAL_RATING &&
                placeDetails.user_ratings_total >= QUALITY_THRESHOLDS.EXCEPTIONAL_REVIEWS,
              isTouristAttraction: true,
              placeTypes: [placeType],
              googleTypes: placeDetails.types,

              indoorOutdoor: 'INDOOR',
              duration: 120, // Default 2 hours for museums
              priceLevel:
                placeDetails.price_level === undefined
                  ? 'MODERATE'
                  : ['FREE', 'LOW', 'MODERATE', 'HIGH', 'VERY_HIGH'][placeDetails.price_level],

              location: {
                latitude: placeDetails.geometry.location.lat,
                longitude: placeDetails.geometry.location.lng,
                address: placeDetails.formatted_address,
                placeId: placeDetails.place_id,
                neighborhood: area.name,
              },
              images: {
                urls:
                  placeDetails.photos?.map(photo => ({
                    url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`,
                  })) || [],
              },

              openingHours: placeDetails.opening_hours || null,
              availableDays:
                placeDetails.opening_hours?.periods?.map(period => period.open.day) || [],

              googlePlaceId: placeDetails.place_id,
              lastSyncedAt: new Date(),
            };

            await prisma.activityRecommendation.upsert({
              where: { googlePlaceId: placeDetails.place_id },
              create: activityData,
              update: {
                rating: activityData.rating,
                ratingTier: activityData.ratingTier,
                reviewCount: activityData.reviewCount,
                reviewCountTier: activityData.reviewCountTier,
                isMustSee: activityData.isMustSee,
                openingHours: activityData.openingHours,
                lastSyncedAt: activityData.lastSyncedAt,
              },
            });

            stats.byArea[area.name]++;
            console.log(`✅ Processed: ${placeDetails.name}`);
            stats.added++;

            // Respect API rate limits
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (error) {
            console.error(`Error processing place:`, error);
            stats.errors++;
          }
        }
      } catch (error) {
        console.error(`Error fetching ${placeType} places:`, error);
        stats.errors++;
      }
    }
  }

  // Print final statistics
  console.log('\nMuseums and Galleries sync completed!');
  console.log('Statistics:');
  console.log(`Total processed: ${stats.processed}`);
  console.log(`Added/Updated: ${stats.added}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);

  console.log('\nBy Area:');
  Object.entries(stats.byArea)
    .sort(([, a], [, b]) => b - a)
    .forEach(([area, count]) => {
      console.log(`${area}: ${count}`);
    });
}

async function main() {
  try {
    const cityId = process.argv[2];
    if (!cityId) {
      throw new Error('Please provide a city ID as an argument');
    }
    await populateMuseumsAndGalleries(cityId);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
