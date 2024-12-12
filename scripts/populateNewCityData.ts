import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PlacesClient, protos } from '@googlemaps/places';
import {
  Prisma,
  PrismaClient,
  RatingTier,
  ReviewCountTier,
  PriceLevel,
  IndoorOutdoor,
  BusinessStatus,
  City,
} from '@prisma/client';
import axios from 'axios';
import dotenv from 'dotenv';

import { Logger } from './logger';
// Import constants (category mapping etc.)
import { CategoryMapping, PlaceCategory, isCityCoastal, PREDEFINED_CITY_AREAS } from '../constants';

dotenv.config({ path: ['.env.local', '.env'] });

const prisma = new PrismaClient();
const placesClient = new PlacesClient();

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Types
interface SearchArea {
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  radius: number;
}

interface ImageUploadResult {
  url: string;
  cdnUrl?: string;
}

interface SyncStats {
  processed: number;
  added: number;
  skipped: number;
  errors: number;
  imageErrors: number;
  byType: Record<PlaceCategory, number>;
  byArea: Record<string, number>;
  apiCalls: {
    searchNearby: number;
    placeDetails: number;
  };
  parkSubtypes: {
    botanical: number;
    urban: number;
  };
  beachSubtypes: {
    beaches: number;
    waterfront: number;
  };
  shoppingSubtypes: {
    malls: number;
    markets: number;
  };
  restaurantSubtypes: {
    upscale: number;
    standard: number;
    byType: Record<string, number>;
  };
}

// Helper Functions

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

// Helper to generate image key
function generateImageKey(photoReference: string, width: number, height: number): string {
  // Create a clean filename from the photo reference
  const cleanReference = photoReference.replace(/[^a-zA-Z0-9]/g, '-');
  return `places/${cleanReference}-${width}x${height}.jpg`;
}

async function processRestaurantsInArea(
  area: SearchArea,
  city: City,
  existingPlaceMap: Map<string, Date>,
  processedPlaceIds: Set<string>,
  stats: SyncStats,
  logger: Logger
): Promise<void> {
  const restaurantTypes = [
    'afghani_restaurant',
    'african_restaurant',
    'american_restaurant',
    'asian_restaurant',
    'brazilian_restaurant',
    'chinese_restaurant',
    'french_restaurant',
    'greek_restaurant',
    'indian_restaurant',
    'italian_restaurant',
    'japanese_restaurant',
    'korean_restaurant',
    'lebanese_restaurant',
    'mexican_restaurant',
    'middle_eastern_restaurant',
    'seafood_restaurant',
    'spanish_restaurant',
    'steak_house',
    'thai_restaurant',
    'turkish_restaurant',
    'vietnamese_restaurant',
    'fine_dining_restaurant',
  ];

  const fieldMask = [
    // Basic fields
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.location',
    'places.types',
    'places.primaryType',
    'places.photos',
    'places.businessStatus',
    'places.editorialSummary',

    // Advanced fields
    'places.priceLevel',
    'places.rating',
    'places.userRatingCount',
    'places.regularOpeningHours',

    // Features we use
    'places.dineIn',
    'places.reservable',
    'places.servesLunch',
    'places.servesDinner',
    'places.servesBeer',
    'places.servesWine',
    'places.servesCocktails',
    'places.servesVegetarianFood',
    'places.outdoorSeating',
    'places.delivery',
    'places.takeout',
  ].join(',');

  for (const restaurantType of restaurantTypes) {
    const request = {
      locationRestriction: {
        circle: {
          center: area.location,
          radius: area.radius,
        },
      },
      includedTypes: [restaurantType],
      excludedTypes: ['fast_food_restaurant', 'cafeteria', 'grocery_store'],
      maxResultCount: 20,
      languageCode: 'en',
    };

    try {
      const response = await placesClient.searchNearby(request, {
        otherArgs: {
          headers: {
            'X-Goog-FieldMask': fieldMask, // Using existing fieldMask
          },
        },
      });

      const places = response[0].places!;

      for (const place of places) {
        stats.processed++;

        if (processedPlaceIds.has(place.id!)) {
          stats.skipped++;
          continue;
        }
        processedPlaceIds.add(place.id!);

        const lastSynced = existingPlaceMap.get(place.id!);
        if (lastSynced && new Date() < new Date(lastSynced.getTime() + 30 * 24 * 60 * 60 * 1000)) {
          stats.skipped++;
          continue;
        }

        if (validatePlace(place, PlaceCategory.RESTAURANT)) {
          await processPlace(place, city, PlaceCategory.RESTAURANT, area, logger);
          stats.added++;
          stats.byType[PlaceCategory.RESTAURANT]++;
          stats.byArea[area.name]++;
        } else {
          stats.skipped++;
        }

        await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting between places
      }

      await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting between cuisine types
    } catch (error) {
      logger.error(`Error processing ${restaurantType} in ${area.name}:`, error as Error);
      stats.errors++;
    }
  }
}

async function fetchAndUploadPhotos(
  photos: protos.google.maps.places.v1.IPhoto[],
  placeId: string
): Promise<ImageUploadResult[]> {
  const results: ImageUploadResult[] = [];
  const maxPhotos = 5;

  for (const photo of photos.slice(0, maxPhotos)) {
    try {
      const photoId = photo.name!.split('/').pop();
      const width = Math.min(photo.widthPx || 800, 1600);
      const height = photo.heightPx || Math.round((width * 3) / 4);

      // Generate consistent key with dimensions
      const key = generateImageKey(photoId!, width, height);

      // Construct the Google Places Photo URL
      const googleUrl = `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=${height}&maxWidthPx=${width}&key=${process
        .env.GOOGLE_MAPS_API_KEY!}`;

      // Check if image already exists
      const exists = await checkImageExists(key);
      if (exists) {
        results.push({
          url: googleUrl, // Original Google URL
          cdnUrl: `${process.env.CDN_BASE_URL}/${key}`, // Our cached CDN URL
        });
        continue;
      }

      // Fetch image
      const response = await axios({
        url: googleUrl,
        method: 'GET',
        responseType: 'arraybuffer',
      });

      // Upload to S3
      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.CDN_BUCKET_NAME!,
          Key: key,
          Body: response.data,
          ContentType: 'image/jpeg',
          CacheControl: 'public, max-age=31536000',
          Metadata: {
            'photo-id': photoId!,
            'place-id': placeId,
            'original-width': width.toString(),
            'original-height': height.toString(),
          },
        })
      );

      results.push({
        url: googleUrl, // Original Google URL
        cdnUrl: `${process.env.CDN_BASE_URL}/${key}`, // Our cached CDN URL
      });

      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to process photo for ${placeId}:`, error);
    }
  }

  return results;
}

function determineRatingTier(rating: number): RatingTier {
  if (rating >= 4.7) return 'EXCEPTIONAL';
  if (rating >= 4.3) return 'HIGH';
  if (rating >= 3.8) return 'AVERAGE';
  return 'LOW';
}

function determineReviewCountTier(count: number): ReviewCountTier {
  if (count >= 5000) return 'VERY_HIGH';
  if (count >= 1000) return 'HIGH';
  if (count >= 500) return 'MODERATE';
  return 'LOW';
}

function determineIndoorOutdoor(place: protos.google.maps.places.v1.IPlace): IndoorOutdoor {
  const types = place.types || [];

  if (types.includes('beach')) return 'OUTDOOR';
  if (types.includes('shopping_mall') || types.includes('department_store')) return 'INDOOR';

  const indoorTypes = ['museum', 'art_gallery', 'restaurant', 'night_club', 'bar'];
  const outdoorTypes = ['park', 'garden', 'beach', 'wildlife_park'];

  const isIndoor = indoorTypes.some(t => types.includes(t));
  const isOutdoor = outdoorTypes.some(t => types.includes(t));

  return isIndoor && isOutdoor ? 'BOTH' : isIndoor ? 'INDOOR' : 'OUTDOOR';
}

function determineDuration(
  place: protos.google.maps.places.v1.IPlace,
  type: PlaceCategory
): number {
  if (type === PlaceCategory.RESTAURANT) {
    return place.priceLevel === 'PRICE_LEVEL_EXPENSIVE' ? 120 : 90;
  }

  const durations: Record<PlaceCategory, number> = {
    MUSEUM: 120,
    HISTORIC: 60,
    ATTRACTION: 120,
    PARK: 90,
    NIGHTLIFE: 120,
    BEACH: 180,
    SHOPPING: 120,
    RESTAURANT: 90,
  };

  return durations[type];
}

function determinePlaceCategory(place: protos.google.maps.places.v1.IPlace): PlaceCategory | null {
  for (const [category, config] of Object.entries(CategoryMapping)) {
    const matchesIncluded = config.includedTypes.some(t => place.types!.includes(t));
    const matchesExcluded = config.excludedTypes?.some(t => place.types!.includes(t)) || false;

    if (matchesIncluded && !matchesExcluded) {
      if (!config.requiresValidation) {
        return category as PlaceCategory;
      }

      // Additional validation for specific categories
      if (category === 'RESTAURANT' && isUpscaleRestaurant(place)) return PlaceCategory.RESTAURANT;
      if (category === 'HISTORIC' && hasHistoricalIndicators(place)) return PlaceCategory.HISTORIC;
      if (category === 'BEACH' && hasBeachIndicators(place)) return PlaceCategory.BEACH;
      if (category === 'NIGHTLIFE' && hasLateNightHours(place)) return PlaceCategory.NIGHTLIFE;
    }
  }

  return null;
}

function isUpscaleRestaurant(place: protos.google.maps.places.v1.IPlace): boolean {
  return (
    place.priceLevel === 'PRICE_LEVEL_EXPENSIVE' ||
    place.priceLevel === 'PRICE_LEVEL_VERY_EXPENSIVE' ||
    place.types!.includes('fine_dining_restaurant') ||
    // Additional checks based on available data
    (place.reservable === true &&
      place.priceLevel === 'PRICE_LEVEL_MODERATE' &&
      place.rating! >= 4.5) // High-rated moderate places might be upscale
  );
}

function hasHistoricalIndicators(place: protos.google.maps.places.v1.IPlace): boolean {
  const text = [place.displayName?.text, place.editorialSummary?.text]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    text.includes('historic') ||
    text.includes('century') ||
    text.includes('ancient') ||
    text.includes('heritage') ||
    /\b1[0-9]{3}\b/.test(text)
  ); // Year pattern
}

function hasBeachIndicators(place: protos.google.maps.places.v1.IPlace): boolean {
  return place.types!.includes('beach') || place.displayName!.text!.toLowerCase().includes('beach');
}

function hasLateNightHours(place: protos.google.maps.places.v1.IPlace): boolean {
  if (!place.regularOpeningHours?.periods) return false;

  return place.regularOpeningHours.periods.some(
    (period: protos.google.maps.places.v1.Place.OpeningHours.IPeriod) => {
      const closeHour = period.close?.hour || 0;
      return closeHour >= 21 || closeHour < 4; // Open past 9 PM or into early morning
    }
  );
}

function validatePlace(
  place: protos.google.maps.places.v1.IPlace,
  category: PlaceCategory
): boolean {
  if (!place.rating || !place.userRatingCount) return false;

  // Base validation varies by category
  const thresholds = {
    rating: getBaseRatingThreshold(category, place),
    reviews: getBaseReviewThreshold(category, place),
  };

  const meetsBaseThresholds =
    place.rating >= thresholds.rating && place.userRatingCount >= thresholds.reviews;

  if (!meetsBaseThresholds) return false;

  // Additional category-specific validation
  switch (category) {
    case PlaceCategory.RESTAURANT:
      return validateRestaurant(place);
    case PlaceCategory.NIGHTLIFE:
      return validateNightlife(place);
    case PlaceCategory.HISTORIC:
      return validateHistoric(place);
    default:
      return true;
  }
}

function getBaseRatingThreshold(
  category: PlaceCategory,
  place: protos.google.maps.places.v1.IPlace
): number {
  switch (category) {
    case PlaceCategory.RESTAURANT:
      return isUpscaleRestaurant(place) ? 4.4 : 4.2;
    case PlaceCategory.HISTORIC:
      return 4.3; // Historical places should be well-reviewed
    case PlaceCategory.NIGHTLIFE:
      return 4.0; // Nightlife tends to have lower ratings
    default:
      return 4.2;
  }
}

function getBaseReviewThreshold(
  category: PlaceCategory,
  place: protos.google.maps.places.v1.IPlace
): number {
  switch (category) {
    case PlaceCategory.RESTAURANT:
      return isUpscaleRestaurant(place) ? 300 : 500;
    case PlaceCategory.HISTORIC:
      return 400; // Historical places should have significant reviews
    case PlaceCategory.NIGHTLIFE:
      return 300; // Lower threshold for nightlife
    default:
      return 500;
  }
}

function validateRestaurant(place: protos.google.maps.places.v1.IPlace): boolean {
  // Must be operational
  if (place.businessStatus !== 'OPERATIONAL') return false;

  // Must offer dine-in
  if (place.dineIn === false) return false;

  // Should serve either lunch or dinner
  if (place.servesLunch === false && place.servesDinner === false) return false;

  // If it's expensive, it should be reservable
  if (
    (place.priceLevel === 'PRICE_LEVEL_EXPENSIVE' ||
      place.priceLevel === 'PRICE_LEVEL_VERY_EXPENSIVE') &&
    !place.reservable
  ) {
    return false;
  }

  return true;
}

function validateNightlife(place: protos.google.maps.places.v1.IPlace): boolean {
  // Must be operational
  if (place.businessStatus !== 'OPERATIONAL') return false;

  // Should be open late (after 9 PM) on some days
  const hasLateHours = hasLateNightHours(place);
  if (!hasLateHours) return false;

  // Should serve drinks if it's a bar/club type
  if (
    place.types!.some(t => ['bar', 'night_club'].includes(t)) &&
    !place.servesBeer &&
    !place.servesWine &&
    !place.servesCocktails
  ) {
    return false;
  }

  return true;
}

function validateHistoric(place: protos.google.maps.places.v1.IPlace): boolean {
  // Must be operational
  if (place.businessStatus !== 'OPERATIONAL') return false;

  // Check editorial summary for historical indicators
  const summary = (place.editorialSummary?.text || '').toLowerCase();
  const hasHistoricalSummary =
    summary.includes('historic') ||
    summary.includes('century') ||
    summary.includes('ancient') ||
    summary.includes('heritage') ||
    /\b1[0-9]{3}\b/.test(summary); // Year pattern

  // Multiple relevant types increase confidence
  const historicTypes = [
    'historical_place',
    'historical_landmark',
    'cultural_landmark',
    'monument',
  ];

  const hasMultipleHistoricTypes = place.types!.filter(t => historicTypes.includes(t)).length > 1;

  // Either need historical summary or multiple historic types
  return hasHistoricalSummary || hasMultipleHistoricTypes;
}

// Main Processing Functions
async function processPlace(
  place: protos.google.maps.places.v1.IPlace,
  city: City,
  category: PlaceCategory,
  area: SearchArea,
  logger: Logger
): Promise<void> {
  logger.progress(`Processing ${place.displayName!.text} (${category})`);
  try {
    // Process photos
    logger.info(`Fetching ${Math.min(place.photos?.length || 0, 5)} photos...`);
    const imageUrls = await fetchAndUploadPhotos(place.photos || [], place.id!);

    const activityData: Prisma.ActivityRecommendationCreateInput = {
      name: place.displayName!.text!,
      description:
        place.editorialSummary?.text ||
        `Visit ${place.displayName!.text!}, a notable destination in ${city.name}.`,
      city: { connect: { id: city.id } },

      rating: place.rating!,
      ratingTier: determineRatingTier(place.rating!),
      reviewCount: place.userRatingCount!,
      reviewCountTier: determineReviewCountTier(place.userRatingCount!),

      isMustSee: place.rating! >= 4.7 && place.userRatingCount! >= 5000,
      isTouristAttraction: place.types!.includes('tourist_attraction'),

      placeTypes: place.types!,
      primaryType: place.primaryType,

      location: {
        latitude: place.location!.latitude,
        longitude: place.location!.longitude,
        address: place.formattedAddress,
        placeId: place.id,
        neighborhood: area.name,
      },

      images: { urls: imageUrls } as unknown as Prisma.InputJsonValue,

      indoorOutdoor: determineIndoorOutdoor(place),
      duration: determineDuration(place, category),
      priceLevel: (place.priceLevel as PriceLevel) || PriceLevel.PRICE_LEVEL_UNSPECIFIED,

      businessStatus: place.businessStatus as BusinessStatus,

      features: {
        wheelchair: place.accessibilityOptions?.wheelchairAccessibleEntrance,
        dineIn: place.dineIn,
        takeout: place.takeout,
        delivery: place.delivery,
        reservable: place.reservable,
        servesBeer: place.servesBeer,
        servesWine: place.servesWine,
        servesVegetarianFood: place.servesVegetarianFood,
        outdoorSeating: place.outdoorSeating,
        parking: place.parkingOptions,
      } as unknown as Prisma.InputJsonValue,

      openingHours: place.regularOpeningHours as unknown as Prisma.InputJsonValue,
      availableDays:
        place.regularOpeningHours?.periods?.map(
          (p: protos.google.maps.places.v1.Place.OpeningHours.IPeriod) => p.open!.day!
        ) || [],

      googlePlaceId: place.id,
      lastSyncedAt: new Date(),
    };

    await prisma.activityRecommendation.upsert({
      where: { googlePlaceId: place.id! },
      create: activityData,
      update: {
        rating: activityData.rating,
        ratingTier: activityData.ratingTier,
        reviewCount: activityData.reviewCount,
        reviewCountTier: activityData.reviewCountTier,
        images: activityData.images,
        features: activityData.features,
        businessStatus: activityData.businessStatus,
        openingHours: activityData.openingHours,
        lastSyncedAt: activityData.lastSyncedAt,
      },
    });
    logger.success(`✅ Successfully processed ${place.displayName!.text}`);
  } catch (error) {
    logger.error(`Error processing place ${place.displayName!.text}:`, error as Error);
    throw error;
  }
}

async function searchNearbyPlaces(
  area: SearchArea,
  config: (typeof CategoryMapping)[keyof typeof CategoryMapping],
  stats: SyncStats,
  logger: Logger
): Promise<protos.google.maps.places.v1.IPlace[]> {
  const fieldMask = [
    // Basic fields
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.location',
    'places.types',
    'places.primaryType',
    'places.photos',
    'places.businessStatus',
    'places.editorialSummary',

    // Advanced fields
    'places.priceLevel',
    'places.rating',
    'places.userRatingCount',
    'places.regularOpeningHours',

    // Features we use
    'places.dineIn',
    'places.reservable',
    'places.servesLunch',
    'places.servesDinner',
    'places.servesBeer',
    'places.servesWine',
    'places.servesCocktails',
    'places.servesVegetarianFood',
    'places.outdoorSeating',
    'places.delivery',
    'places.takeout',
  ].join(',');

  stats.apiCalls.searchNearby++;
  try {
    const request = {
      locationRestriction: {
        circle: {
          center: area.location,
          radius: area.radius,
        },
      },
      includedTypes: config.includedTypes,
      excludedTypes: config.excludedTypes,
      maxResultCount: 20,
      languageCode: 'en',
    };

    const response = await placesClient.searchNearby(request, {
      otherArgs: {
        headers: {
          'X-Goog-FieldMask': fieldMask,
        },
      },
    });

    return response[0].places!;
  } catch (error) {
    logger.error('Error in searchNearby:', error as Error);
    return [];
  }
}

async function processCityArea(
  area: SearchArea,
  city: City,
  existingPlaceMap: Map<string, Date>,
  processedPlaceIds: Set<string>,
  stats: SyncStats,
  logger: Logger
): Promise<void> {
  logger.info(`\nProcessing area: ${area.name}`);
  stats.byArea[area.name] = 0;

  // Process each category
  for (const [category, config] of Object.entries(CategoryMapping)) {
    if (category === PlaceCategory.RESTAURANT) {
      await processRestaurantsInArea(
        area,
        city,
        existingPlaceMap,
        processedPlaceIds,
        stats,
        logger
      );
    } else {
      // Original logic for non-restaurant categories
      logger.progress(`\n🔍 Searching for ${category} in ${area.name}...`);
      const places = await searchNearbyPlaces(area, config, stats, logger);

      for (const place of places) {
        stats.processed++;

        if (processedPlaceIds.has(place.id!)) {
          stats.skipped++;
          continue;
        }
        processedPlaceIds.add(place.id!);

        const lastSynced = existingPlaceMap.get(place.id!);
        if (lastSynced && new Date() < new Date(lastSynced.getTime() + 30 * 24 * 60 * 60 * 1000)) {
          stats.skipped++;
          continue;
        }

        try {
          const placeCategory = determinePlaceCategory(place);
          if (!placeCategory || !validatePlace(place, placeCategory)) {
            stats.skipped++;
            continue;
          }

          await processPlace(place, city, placeCategory, area, logger);
          stats.added++;
          stats.byType[placeCategory]++;
          stats.byArea[area.name]++;

          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          logger.error(`Error processing place ${place.displayName!.text}:`, error as Error);
          stats.errors++;
        }
      }
    }
  }
}

async function processCoastalFeatures(
  area: SearchArea,
  city: City,
  existingPlaceMap: Map<string, Date>,
  processedPlaceIds: Set<string>,
  stats: SyncStats,
  logger: Logger
): Promise<void> {
  logger.info(`\nSearching for coastal features in ${area.name}...`);

  const places = await searchNearbyPlaces(
    area,
    {
      includedTypes: ['beach'],
      excludedTypes: [],
      requiresValidation: true,
    },
    stats,
    logger
  );

  for (const place of places) {
    if (hasBeachIndicators(place)) {
      stats.processed++;

      if (processedPlaceIds.has(place.id!)) {
        stats.skipped++;
        continue;
      }
      processedPlaceIds.add(place.id!);

      const lastSynced = existingPlaceMap.get(place.id!);
      if (lastSynced && new Date() < new Date(lastSynced.getTime() + 30 * 24 * 60 * 60 * 1000)) {
        stats.skipped++;
        continue;
      }

      try {
        await processPlace(place, city, PlaceCategory.BEACH, area, logger);
        stats.added++;
        stats.byType[PlaceCategory.BEACH] = (stats.byType[PlaceCategory.BEACH] || 0) + 1;
        stats.byArea[area.name] = (stats.byArea[area.name] || 0) + 1;

        // Update beach statistics
        const isBeach = place.types!.includes('beach');
        stats.beachSubtypes[isBeach ? 'beaches' : 'waterfront']++;

        await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
      } catch (error) {
        logger.error(
          `Error processing coastal feature ${place.displayName!.text}:`,
          error as Error
        );
        stats.errors++;
      }
    }
  }
}

function initializeStats(): SyncStats {
  const defaultByType = Object.values(PlaceCategory).reduce(
    (acc, type) => ({ ...acc, [type]: 0 }),
    {} as Record<PlaceCategory, number>
  );

  return {
    processed: 0,
    added: 0,
    skipped: 0,
    errors: 0,
    imageErrors: 0,
    byType: defaultByType,
    byArea: {},
    apiCalls: {
      searchNearby: 0,
      placeDetails: 0,
    },
    parkSubtypes: {
      botanical: 0,
      urban: 0,
    },
    beachSubtypes: {
      beaches: 0,
      waterfront: 0,
    },
    shoppingSubtypes: {
      malls: 0,
      markets: 0,
    },
    restaurantSubtypes: {
      upscale: 0,
      standard: 0,
      byType: {},
    },
  };
}

function generateSearchAreas(city: City): SearchArea[] {
  // Use predefined areas if available
  if (PREDEFINED_CITY_AREAS[city.name]) {
    return PREDEFINED_CITY_AREAS[city.name];
  }

  // Generate grid pattern
  const areas: SearchArea[] = [];
  const baseRadius = 2000; // 2km radius
  const gridSize = 3;
  const offset = (baseRadius * 1.5) / 111300; // Convert meters to degrees

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const lat = city.latitude + (i - gridSize / 2) * offset;
      const lng = city.longitude + (j - gridSize / 2) * offset;

      areas.push({
        name: `${city.name} - Area ${i * gridSize + j + 1}`,
        location: { latitude: lat, longitude: lng },
        radius: baseRadius,
      });
    }
  }

  return areas;
}

async function populateCityData(cityId: string, logger: Logger) {
  const stats = initializeStats();

  try {
    const city = await prisma.city.findUnique({ where: { id: cityId } });
    if (!city) throw new Error(`City with ID ${cityId} not found`);

    logger.info(`Starting comprehensive data sync for ${city.name}...`);

    // Get existing places for skip logic
    logger.info('\nFetching existing places...');
    const existingPlaces = await prisma.activityRecommendation.findMany({
      where: { cityId },
      select: { googlePlaceId: true, lastSyncedAt: true },
    });
    logger.info(`Found ${existingPlaces.length} existing places`);

    const existingPlaceMap = new Map(existingPlaces.map(p => [p.googlePlaceId!, p.lastSyncedAt]));
    const processedPlaceIds = new Set<string>();

    // Process each area
    const searchAreas = generateSearchAreas(city);
    logger.info(`Generated ${searchAreas.length} search areas`);

    for (const area of searchAreas) {
      await processCityArea(area, city, existingPlaceMap, processedPlaceIds, stats, logger);
    }

    logger.success('\n✨ Sync completed!');
    logger.stats(stats);
  } catch (error) {
    logger.error('❌ Error in populateCityData:', error as Error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
async function main() {
  const cityId = process.argv[2];
  if (!cityId) {
    throw new Error('Please provide a city ID as an argument');
  }

  const timestamp = new Date()
    .toLocaleString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace(/[:,]/g, '')
    .replace(/ /g, '-');
  const filename = `sync-stats-${cityId}-${timestamp}.txt`;
  const logger = new Logger(filename);

  logger.info('Starting sync...');
  logger.info(`API Key status: ${process.env.GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing'}`);
  logger.info(
    `AWS Configuration status: ${
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_REGION
        ? 'Present'
        : 'Missing'
    }`
  );

  try {
    await populateCityData(cityId, logger);
  } catch (error) {
    logger.error('Fatal error:', error as Error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { populateCityData };
