import { PlacesClient, protos } from '@googlemaps/places';
import { City, PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

import { Logger } from './logger';
import { CategoryMapping, PlaceCategory, PREDEFINED_CITY_AREAS } from '../constants';

dotenv.config({ path: ['.env.local', '.env'] });

const prisma = new PrismaClient();
const placesClient = new PlacesClient();

// Types
interface SearchArea {
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  radius: number;
}

interface SyncStats {
  processed: number;
  added: number;
  updated: number;
  errors: number;
  byType: Record<PlaceCategory, number>;
  byArea: Record<string, number>;
  apiCalls: {
    searchNearby: number;
  };
}

function validatePlace(
  place: protos.google.maps.places.v1.IPlace,
  category: PlaceCategory
): boolean {
  // First check if we have the basic required fields
  if (!place.rating || !place.userRatingCount) return false;
  if (place.businessStatus !== 'OPERATIONAL') return false;

  const thresholds = {
    rating: getBaseRatingThreshold(category, place),
    reviews: getBaseReviewThreshold(category, place),
  };

  // Check base rating and review thresholds
  if (place.rating < thresholds.rating || place.userRatingCount < thresholds.reviews) {
    return false;
  }

  // Now check category-specific requirements
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

function validateHistoric(place: protos.google.maps.places.v1.IPlace): boolean {
  const summary = (place.editorialSummary?.text || '').toLowerCase();
  const hasHistoricalSummary =
    summary.includes('historic') ||
    summary.includes('century') ||
    summary.includes('ancient') ||
    summary.includes('heritage') ||
    /\b1[0-9]{3}\b/.test(summary);

  const historicTypes = [
    'historical_place',
    'historical_landmark',
    'cultural_landmark',
    'monument',
  ];

  const hasMultipleHistoricTypes = place.types!.filter(t => historicTypes.includes(t)).length > 1;

  return hasHistoricalSummary || hasMultipleHistoricTypes;
}

function validateRestaurant(place: protos.google.maps.places.v1.IPlace): boolean {
  if (place.dineIn === false) return false;
  if (place.servesLunch === false && place.servesDinner === false) return false;
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
  if (!hasLateNightHours(place)) return false;
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

function hasLateNightHours(place: protos.google.maps.places.v1.IPlace): boolean {
  if (!place.regularOpeningHours?.periods) return false;

  return place.regularOpeningHours.periods.some(period => {
    const closeHour = period.close?.hour || 0;
    return closeHour >= 21 || closeHour < 4;
  });
}

function getBaseRatingThreshold(
  category: PlaceCategory,
  place: protos.google.maps.places.v1.IPlace
): number {
  switch (category) {
    case PlaceCategory.RESTAURANT:
      return isUpscaleRestaurant(place) ? 4.4 : 4.2;
    case PlaceCategory.HISTORIC:
      return 4.3;
    case PlaceCategory.NIGHTLIFE:
      return 4.0;
    case PlaceCategory.MUSEUM:
      return 4.1;
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
      return 400;
    case PlaceCategory.NIGHTLIFE:
      return 300;
    case PlaceCategory.SPA:
      return 200;
    default:
      return 500;
  }
}

function isUpscaleRestaurant(place: protos.google.maps.places.v1.IPlace): boolean {
  return (
    place.priceLevel === 'PRICE_LEVEL_EXPENSIVE' ||
    place.priceLevel === 'PRICE_LEVEL_VERY_EXPENSIVE' ||
    place.types!.includes('fine_dining_restaurant') ||
    (place.reservable === true &&
      place.priceLevel === 'PRICE_LEVEL_MODERATE' &&
      place.rating! >= 4.5)
  );
}
async function processPlace(
  place: protos.google.maps.places.v1.IPlace,
  city: City,
  area: SearchArea,
  logger: Logger
): Promise<void> {
  logger.info(`Processing: ${place.displayName?.text} in ${area.name}`);

  try {
    // Store only basic reference data
    const placeData = {
      placeId: place.id!,
      name: place.displayName!.text!,
      location: {
        latitude: place.location?.latitude,
        longitude: place.location?.longitude,
        neighborhood: area.name,
      },
      cityId: city.id,
      lastSyncedAt: new Date(),
    };

    await prisma.activityRecommendation.upsert({
      where: { placeId: place.id! },
      create: placeData,
      update: {
        name: placeData.name!,
        location: placeData.location,
        lastSyncedAt: placeData.lastSyncedAt,
      },
    });

    logger.info(`✅ Processed successfully: ${place.displayName?.text} in ${area.name}`);
  } catch (error) {
    logger.error(`Error processing place ${place.displayName?.text}:`, error as Error);
    throw error;
  }
}

async function processPlacesByType(
  area: SearchArea,
  city: City,
  existingPlaceMap: Map<string, Date>,
  processedPlaceIds: Set<string>,
  stats: SyncStats,
  logger: Logger
): Promise<void> {
  logger.info(`\nProcessing area: ${area.name}`);
  stats.byArea[area.name] = 0;

  for (const [category, config] of Object.entries(CategoryMapping)) {
    logger.info(`\n🔍 Processing ${category} types in ${area.name}...`);

    for (const placeType of config.includedTypes) {
      logger.info(`\n  📍 Searching for type: ${placeType}`);

      const request = {
        locationRestriction: {
          circle: {
            center: area.location,
            radius: area.radius,
          },
        },
        includedTypes: [placeType],
        maxResultCount: 20,
        languageCode: 'en',
      };

      try {
        stats.apiCalls.searchNearby++;
        const response = await placesClient.searchNearby(request);
        const places = response[0].places || [];

        for (const place of places) {
          stats.processed++;

          if (processedPlaceIds.has(place.id!)) {
            logger.info(`Skipped (already processed): ${place.displayName?.text} in ${area.name}`);
            continue;
          }
          processedPlaceIds.add(place.id!);

          const lastSynced = existingPlaceMap.get(place.id!);
          if (
            lastSynced &&
            new Date() < new Date(lastSynced.getTime() + 30 * 24 * 60 * 60 * 1000)
          ) {
            logger.info(`Skipped (recently synced): ${place.displayName?.text} in ${area.name}`);
            continue;
          }

          if (!validatePlace(place, category as PlaceCategory)) {
            logger.info(`Skipped (failed validation): ${place.displayName?.text} in ${area.name}`);
            continue;
          }

          try {
            await processPlace(place, city, area, logger);
            stats.added++;
            stats.byArea[area.name]++;
            stats.byType[category as PlaceCategory]++;
          } catch (error) {
            logger.error(`Error processing place ${place.displayName?.text}:`, error as Error);
            stats.errors++;
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        logger.error(`Error processing type ${placeType} in ${area.name}:`, error as Error);
        stats.errors++;
      }

      // Rate limiting between type searches
      await new Promise(resolve => setTimeout(resolve, 500));
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
    updated: 0,
    errors: 0,
    byType: defaultByType,
    byArea: {},
    apiCalls: {
      searchNearby: 0,
    },
  };
}

// Existing generateSearchAreas function remains the same
function generateSearchAreas(city: City): SearchArea[] {
  if (PREDEFINED_CITY_AREAS[city.name]) {
    return PREDEFINED_CITY_AREAS[city.name];
  }

  const areas: SearchArea[] = [];
  const baseRadius = 2000;
  const gridSize = 3;
  const offset = (baseRadius * 1.5) / 111300;

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

    logger.info(`Starting reference data sync for ${city.name}...`);

    const existingPlaces = await prisma.activityRecommendation.findMany({
      where: { cityId },
      select: { placeId: true, lastSyncedAt: true },
    });

    const existingPlaceMap = new Map(existingPlaces.map(p => [p.placeId!, p.lastSyncedAt]));
    const processedPlaceIds = new Set<string>();
    const searchAreas = generateSearchAreas(city);

    for (const area of searchAreas) {
      await processPlacesByType(area, city, existingPlaceMap, processedPlaceIds, stats, logger);
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

// Main execution remains the same
async function main(cityId: string, logger: Logger) {
  try {
    await populateCityData(cityId, logger);
  } catch (error) {
    logger.error('Fatal error:', error as Error);
    process.exit(1);
  }
}

if (require.main === module) {
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
  main(cityId, logger);
}

export { populateCityData };
