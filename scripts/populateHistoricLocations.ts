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

// Types that might indicate a place of historical significance
const POTENTIAL_HISTORIC_TYPES = [
  AddressType.tourist_attraction,
  AddressType.point_of_interest,
  AddressType.natural_feature,
  AddressType.church,
  AddressType.synagogue,
  AddressType.mosque,
  AddressType.hindu_temple,
  AddressType.train_station,
  AddressType.premise,
] as const;

// Words and phrases that strongly indicate historical significance
const HISTORIC_INDICATORS = {
  // Time-related terms
  TIME_PERIODS: new Set([
    'century',
    'built in',
    'opened in',
    'founded in',
    'established in',
    'dated',
    'ancient',
    'historic',
    'historical',
    'heritage',
  ]),

  // Architectural/monument terms
  ARCHITECTURAL: new Set([
    'gothic',
    'victorian',
    'colonial',
    'classical',
    'renaissance',
    'baroque',
    'monument',
    'memorial',
    'landmark',
    'ruins',
  ]),

  // Cultural/institutional terms
  CULTURAL: new Set([
    'national monument',
    'national historic',
    'preserved',
    'restoration',
    'traditional',
    'original',
  ]),
};

// Quality thresholds - different for religious vs other historical sites
const QUALITY_THRESHOLDS = {
  RELIGIOUS: {
    MIN_RATING: 4.0,
    MIN_REVIEWS: 500,
  },
  STANDARD: {
    MIN_RATING: 4.3,
    MIN_REVIEWS: 1000,
  },
};

interface HistoricalIndicatorMatch {
  isHistorical: boolean;
  timeMatch?: string;
  architecturalMatch?: string;
  culturalMatch?: string;
}

function checkHistoricalIndicators(text: string): HistoricalIndicatorMatch {
  const lowerText = text.toLowerCase();

  // Check for time period references
  const timeMatch = Array.from(HISTORIC_INDICATORS.TIME_PERIODS).find(term =>
    lowerText.includes(term)
  );

  // Check for architectural/monument terms
  const architecturalMatch = Array.from(HISTORIC_INDICATORS.ARCHITECTURAL).find(term =>
    lowerText.includes(term)
  );

  // Check for cultural/institutional terms
  const culturalMatch = Array.from(HISTORIC_INDICATORS.CULTURAL).find(term =>
    lowerText.includes(term)
  );

  // Check for year mentions (e.g., 1886)
  const yearMatch = lowerText.match(/\b1[0-9]{3}\b/);

  return {
    isHistorical: !!(timeMatch || architecturalMatch || culturalMatch || yearMatch),
    timeMatch,
    architecturalMatch,
    culturalMatch,
  };
}

function isReligiousPlace(types: string[]): boolean {
  return types.some(type => ['church', 'synagogue', 'mosque', 'hindu_temple'].includes(type));
}

function validateHistoricPlace(place: any): boolean {
  // Must have basic required fields
  if (!place?.name || !place?.geometry?.location) {
    console.log(`Skipping ${place?.name || 'unnamed'} - missing basic details`);
    return false;
  }

  // Must have ratings that meet thresholds
  if (!place.rating || !place.user_ratings_total) {
    console.log(`Skipping ${place.name} - missing ratings`);
    return false;
  }

  // Apply appropriate thresholds based on type
  const thresholds = isReligiousPlace(place.types)
    ? QUALITY_THRESHOLDS.RELIGIOUS
    : QUALITY_THRESHOLDS.STANDARD;

  if (place.rating < thresholds.MIN_RATING || place.user_ratings_total < thresholds.MIN_REVIEWS) {
    console.log(`Skipping ${place.name} - doesn't meet quality thresholds`);
    return false;
  }

  // Must have photos
  if (!place.photos || place.photos.length === 0) {
    console.log(`Skipping ${place.name} - no photos`);
    return false;
  }

  // For non-religious places, must have historical indicators
  if (!isReligiousPlace(place.types)) {
    const textToCheck = [place.name, place.editorial_summary?.overview || ''].join(' ');

    const historicalMatch = checkHistoricalIndicators(textToCheck);

    if (!historicalMatch.isHistorical) {
      console.log(`Skipping ${place.name} - no historical indicators`);
      return false;
    }

    // Log what made it historical
    console.log(`Historical indicators for ${place.name}:`, {
      timeMatch: historicalMatch.timeMatch,
      architecturalMatch: historicalMatch.architecturalMatch,
      culturalMatch: historicalMatch.culturalMatch,
    });
  }

  return true;
}

async function populateHistoricSites(cityId: string) {
  const city = await prisma.city.findUnique({
    where: { id: cityId },
  });

  if (!city) {
    throw new Error(`City with ID ${cityId} not found`);
  }

  console.log(`Starting historic sites sync for ${city.name}...`);

  const stats = {
    processed: 0,
    added: 0,
    skipped: 0,
    errors: 0,
    byReason: {} as Record<string, number>,
  };

  const processedPlaceIds = new Set<string>();

  // Search from city center
  const searchArea = {
    location: {
      lat: city.latitude,
      lng: city.longitude,
    },
    radius: 5000, // 5km radius
  };

  for (const placeType of POTENTIAL_HISTORIC_TYPES) {
    try {
      const response = await googleMapsClient.placesNearby({
        params: {
          key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
          location: searchArea.location,
          radius: searchArea.radius,
          type: placeType,
          rankby: PlacesNearbyRanking.prominence,
        },
      });

      for (const place of response.data.results) {
        stats.processed++;
        const placeId = place.place_id!;

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

          // Validate historical significance
          if (!validateHistoricPlace(placeDetails)) {
            stats.skipped++;
            continue;
          }

          const isReligious = isReligiousPlace(placeDetails.types);

          const activityData: Prisma.ActivityRecommendationCreateInput = {
            name: placeDetails.name,
            description:
              placeDetails.editorial_summary?.overview ||
              `Visit ${placeDetails.name}, a historic site in ${city.name}.`,
            city: { connect: { id: city.id } },

            rating: placeDetails.rating,
            ratingTier:
              placeDetails.rating >= 4.7
                ? 'EXCEPTIONAL'
                : placeDetails.rating >= 4.3
                  ? 'HIGH'
                  : 'AVERAGE',
            reviewCount: placeDetails.user_ratings_total,
            reviewCountTier:
              placeDetails.user_ratings_total >= 5000
                ? 'VERY_HIGH'
                : placeDetails.user_ratings_total >= 1000
                  ? 'HIGH'
                  : 'MODERATE',

            isMustSee: placeDetails.rating >= 4.7 && placeDetails.user_ratings_total >= 5000,
            isTouristAttraction: true,
            placeTypes: [placeType],
            googleTypes: placeDetails.types,

            indoorOutdoor: isReligious ? 'INDOOR' : 'BOTH',
            duration: isReligious ? 45 : 60,
            priceLevel:
              placeDetails.price_level === undefined
                ? 'FREE'
                : ['FREE', 'LOW', 'MODERATE', 'HIGH', 'VERY_HIGH'][placeDetails.price_level],

            location: {
              latitude: placeDetails.geometry.location.lat,
              longitude: placeDetails.geometry.location.lng,
              address: placeDetails.formatted_address,
              placeId: placeDetails.place_id,
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

          console.log(`✅ Added historical place: ${placeDetails.name}`);
          stats.added++;

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

  console.log('\nHistoric Sites sync completed!');
  console.log('Statistics:');
  console.log(`Total processed: ${stats.processed}`);
  console.log(`Added: ${stats.added}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);
}

async function main() {
  try {
    const cityId = process.argv[2];
    if (!cityId) {
      throw new Error('Please provide a city ID as an argument');
    }
    await populateHistoricSites(cityId);
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
