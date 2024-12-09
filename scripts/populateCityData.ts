/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  AddressType,
  Client as GoogleMapsClient,
  Place,
  PlacesNearbyRanking,
} from '@googlemaps/google-maps-services-js';
import {
  Prisma,
  PrismaClient,
  RatingTier,
  ReviewCountTier,
  PriceLevel,
  IndoorOutdoor,
  City,
} from '@prisma/client';
import dotenv from 'dotenv';

import {
  isCityCoastal,
  isHistoricThresholds,
  PARK_TYPES,
  PLACE_TYPES,
  PlaceCategory,
  PREDEFINED_CITY_AREAS,
  THRESHOLDS,
} from '../constants';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();
const googleMapsClient = new GoogleMapsClient({});

// City-specific configurations
interface SearchArea {
  name: string;
  location: { lat: number; lng: number };
  radius: number;
}

interface CityConfig {
  searchPattern: 'SINGLE_POINT' | 'GRID' | 'MULTI_AREA';
  baseRadius: number;
  minRating: number;
  minReviews: number;
  areas?: SearchArea[];
}

//  city size and configuration
function getCityConfig(city: City): CityConfig {
  const MAJOR_CITIES = new Set(['new york-US', 'london-GB', 'paris-FR']);
  const cityKey = `${city.name.toLowerCase()}-${city.countryCode}`;

  if (MAJOR_CITIES.has(cityKey)) {
    return {
      searchPattern: 'MULTI_AREA',
      baseRadius: 2000,
      minRating: 4.3,
      minReviews: 1000,
      areas: PREDEFINED_CITY_AREAS[city.name],
    };
  }

  return {
    searchPattern: 'GRID',
    baseRadius: 3000,
    minRating: 4.2,
    minReviews: 500,
  };
}

// Generate search areas based on city configuration
function generateSearchAreas(city: City): SearchArea[] {
  const config = getCityConfig(city);

  if (config.areas) {
    return config.areas;
  }

  if (config.searchPattern === 'GRID') {
    const areas: SearchArea[] = [];
    const gridSize = config.baseRadius >= 3000 ? 3 : 2;
    const offset = (config.baseRadius * 1.5) / 111300;

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const lat = city.latitude + (i - gridSize / 2) * offset;
        const lng = city.longitude + (j - gridSize / 2) * offset;

        areas.push({
          name: `${city.name} - Area ${i * gridSize + j + 1}`,
          location: { lat, lng },
          radius: config.baseRadius,
        });
      }
    }
    return areas;
  }

  return [
    {
      name: city.name,
      location: { lat: city.latitude, lng: city.longitude },
      radius: config.baseRadius,
    },
  ];
}

// Validation functions

function checkShoppingIndicators(place: Place): boolean {
  const nameAndDescription = [
    place.name?.toLowerCase() || '',
    place.editorial_summary?.overview?.toLowerCase() || '',
  ].join(' ');

  // Check if it's a primary shopping type
  const isPrimaryShoppingType = place.types!.some(t => PLACE_TYPES.SHOPPING.PRIMARY.has(t));

  // Check for shopping keywords in name/description
  const hasShoppingKeyword = Array.from(PLACE_TYPES.SHOPPING.KEYWORDS).some(term =>
    nameAndDescription.includes(term)
  );

  return isPrimaryShoppingType || hasShoppingKeyword;
}

function checkHistoricalIndicators(text: string): boolean {
  const lowerText = text.toLowerCase();

  const hasTimeIndicator = Array.from(PLACE_TYPES.HISTORIC_INDICATORS.TIME_PERIODS).some(term =>
    lowerText.includes(term)
  );

  const hasArchitecturalIndicator = Array.from(PLACE_TYPES.HISTORIC_INDICATORS.ARCHITECTURAL).some(
    term => lowerText.includes(term)
  );

  const hasCulturalIndicator = Array.from(PLACE_TYPES.HISTORIC_INDICATORS.CULTURAL).some(term =>
    lowerText.includes(term)
  );

  const hasYearMention = lowerText.match(/\b1[0-9]{3}\b/);

  return !!(
    hasTimeIndicator ||
    hasArchitecturalIndicator ||
    hasCulturalIndicator ||
    hasYearMention
  );
}

function isUpscaleRestaurant(place: Place): boolean {
  const nameAndDescription = [
    place.name?.toLowerCase() || '',
    place.editorial_summary?.overview?.toLowerCase() || '',
  ].join(' ');

  // Keywords that suggest upscale dining
  const upscaleIndicators = new Set([
    'michelin',
    'fine dining',
    'upscale',
    'gourmet',
    'haute cuisine',
    'chef',
    'luxury',
    'elegant',
    'sophisticated',
  ]);

  const hasUpscaleIndicator = Array.from(upscaleIndicators).some(term =>
    nameAndDescription.includes(term)
  );

  // Consider price level 3 or 4 as upscale
  const isExpensive = place.price_level !== undefined && place.price_level >= 3;

  return hasUpscaleIndicator || isExpensive;
}

function checkBeachIndicators(place: Place): boolean {
  const nameAndDescription = [
    place.name?.toLowerCase() || '',
    place.editorial_summary?.overview?.toLowerCase() || '',
  ].join(' ');

  const hasBeachName = Array.from(PLACE_TYPES.BEACH_INDICATORS.NAMES).some(term =>
    nameAndDescription.includes(term)
  );

  const hasNaturalFeature = Array.from(PLACE_TYPES.BEACH_INDICATORS.NATURAL_FEATURES).some(term =>
    nameAndDescription.includes(term)
  );

  const isNaturalFeature = place.types!.includes(AddressType.natural_feature);

  return hasBeachName || (isNaturalFeature && hasNaturalFeature);
}

function validatePlace(place: Place, type: PlaceCategory): boolean {
  if (!place?.name || !place?.geometry?.location || !place.photos?.length) {
    return false;
  }

  if (type === PlaceCategory.RESTAURANT) {
    const isUpscale = isUpscaleRestaurant(place);
    const thresholds = isUpscale ? THRESHOLDS.RESTAURANT.UPSCALE : THRESHOLDS.RESTAURANT.STANDARD;

    return (
      place.rating! >= thresholds.MIN_RATING && place.user_ratings_total! >= thresholds.MIN_REVIEWS
    );
  }

  const thresholds = THRESHOLDS[type];

  // Handle HISTORIC separately since it has a different structure
  if (type === PlaceCategory.HISTORIC) {
    const thresholds = THRESHOLDS[type];
    if (!isHistoricThresholds(thresholds)) {
      return false;
    }

    const isReligious = place.types!.some(t =>
      ['church', 'synagogue', 'mosque', 'hindu_temple'].includes(t)
    );

    const criteria = isReligious ? thresholds.RELIGIOUS : thresholds.STANDARD;

    if (place.rating! < criteria.MIN_RATING || place.user_ratings_total! < criteria.MIN_REVIEWS) {
      return false;
    }

    if (!isReligious) {
      const textToCheck = [place.name, place.editorial_summary?.overview || ''].join(' ');
      return checkHistoricalIndicators(textToCheck);
    }
    return true;
  }

  // Handle NIGHTLIFE
  if (type === PlaceCategory.NIGHTLIFE) {
    const isPrimaryNightlife = place.types!.some(t => PLACE_TYPES.NIGHTLIFE.PRIMARY.has(t as any));

    const isLateNightVenue = place.opening_hours?.periods?.some(
      p => parseInt(p.close?.time || '0000') >= 2200
    );

    if (!isPrimaryNightlife && !isLateNightVenue) {
      return false;
    }

    return (
      place.rating! >= (thresholds as typeof THRESHOLDS.NIGHTLIFE).MIN_RATING &&
      place.user_ratings_total! >= (thresholds as typeof THRESHOLDS.NIGHTLIFE).MIN_REVIEWS
    );
  }

  if (type === PlaceCategory.SHOPPING) {
    const isMall =
      place.types!.includes(AddressType.shopping_mall) ||
      place.types!.includes(AddressType.department_store);
    const thresholds = isMall ? THRESHOLDS.SHOPPING.MALL : THRESHOLDS.SHOPPING.MARKET;

    return (
      place.rating! >= thresholds.MIN_RATING && place.user_ratings_total! >= thresholds.MIN_REVIEWS
    );
  }

  // For all other types (MUSEUM, ATTRACTION, PARK) that have direct MIN_RATING/MIN_REVIEWS
  if ('MIN_RATING' in thresholds && 'MIN_REVIEWS' in thresholds) {
    return (
      place.rating! >= thresholds.MIN_RATING && place.user_ratings_total! >= thresholds.MIN_REVIEWS
    );
  }

  return false;
}

// Helper function to determine place type
const determinePlaceType = (place: Place): PlaceCategory => {
  if (place.types!.includes(AddressType.restaurant)) {
    return PlaceCategory.RESTAURANT;
  }

  if (checkBeachIndicators(place)) {
    return PlaceCategory.BEACH;
  }

  if (checkShoppingIndicators(place)) {
    return PlaceCategory.SHOPPING;
  }

  if (
    place.types!.some(
      t =>
        PLACE_TYPES.NIGHTLIFE.PRIMARY.has(t as any) &&
        place.opening_hours?.periods?.some(p => parseInt(p.close?.time || '0000') >= 2200)
    )
  ) {
    return PlaceCategory.NIGHTLIFE;
  }

  if (place.types!.includes(AddressType.museum) || place.types!.includes(AddressType.art_gallery)) {
    return PlaceCategory.MUSEUM;
  } else if (place.types!.includes(AddressType.park)) {
    const placeName = place.name!.toLowerCase();
    const description = place.editorial_summary?.overview?.toLowerCase() || '';
    const combinedText = `${placeName} ${description}`;

    const isBotanical = Array.from(PARK_TYPES.BOTANICAL).some(term => combinedText.includes(term));
    const isUrbanPark = Array.from(PARK_TYPES.URBAN).some(term => combinedText.includes(term));

    // Only categorize as PARK if it's a botanical garden or significant urban park
    if (isBotanical || isUrbanPark) {
      return PlaceCategory.PARK;
    }
  }

  if (checkHistoricalIndicators(place.name + ' ' + (place.editorial_summary?.overview || ''))) {
    return PlaceCategory.HISTORIC;
  }

  return PlaceCategory.ATTRACTION;
};

// Process and store place data
async function processPlace(
  place: Place,
  city: City,
  type: PlaceCategory,
  area: SearchArea
): Promise<void> {
  const isPrimaryAttraction = place.types!.some(t => PLACE_TYPES.PRIMARY.has(t as any));
  const hasBlacklistedType = place.types!.some(t => PLACE_TYPES.BLACKLIST.has(t));

  if (hasBlacklistedType && !isPrimaryAttraction) {
    return;
  }

  let ratingTier: RatingTier = 'AVERAGE';
  let reviewCountTier: ReviewCountTier = 'MODERATE';

  if (type === PlaceCategory.PARK) {
    const placeName = place.name!.toLowerCase();
    const description = place.editorial_summary?.overview?.toLowerCase() || '';
    const combinedText = `${placeName} ${description}`;

    const isBotanical = Array.from(PARK_TYPES.BOTANICAL).some(term => combinedText.includes(term));

    const thresholds = isBotanical ? THRESHOLDS.PARK.BOTANICAL : THRESHOLDS.PARK.URBAN;

    ratingTier =
      place.rating! >= thresholds.EXCEPTIONAL_RATING
        ? 'EXCEPTIONAL'
        : place.rating! >= thresholds.MIN_RATING
          ? 'HIGH'
          : 'AVERAGE';

    reviewCountTier =
      place.user_ratings_total! >= thresholds.EXCEPTIONAL_REVIEWS
        ? 'VERY_HIGH'
        : place.user_ratings_total! >= thresholds.MIN_REVIEWS
          ? 'HIGH'
          : 'MODERATE';
  } else {
    const thresholds = THRESHOLDS[type];
    if ('EXCEPTIONAL_RATING' in thresholds && 'MIN_RATING' in thresholds) {
      ratingTier =
        place.rating! >= thresholds.EXCEPTIONAL_RATING
          ? 'EXCEPTIONAL'
          : place.rating! >= thresholds.MIN_RATING
            ? 'HIGH'
            : 'AVERAGE';

      reviewCountTier =
        place.user_ratings_total! >= 5000
          ? 'VERY_HIGH'
          : place.user_ratings_total! >= 1000
            ? 'HIGH'
            : 'MODERATE';
    }
  }

  const activityData: Prisma.ActivityRecommendationCreateInput = {
    name: place.name!,
    description:
      place.editorial_summary?.overview ||
      `Visit ${place.name}, a notable destination in ${city.name}.`,
    city: { connect: { id: city.id } },

    rating: place.rating!,
    ratingTier,
    reviewCount: place.user_ratings_total!,
    reviewCountTier,

    isMustSee: ratingTier === 'EXCEPTIONAL' && reviewCountTier === 'VERY_HIGH',
    isTouristAttraction: place.types!.includes(AddressType.tourist_attraction),

    placeTypes: place.types!.filter(t => PLACE_TYPES.PRIMARY.has(t as any)),
    googleTypes: place.types,

    indoorOutdoor: determineIndoorOutdoor(
      place.types!,
      place.name!,
      place.editorial_summary?.overview
    ),
    duration: determineDuration(place, type),
    priceLevel: determinePriceLevel(place),

    location: {
      latitude: place.geometry!.location.lat,
      longitude: place.geometry!.location.lng,
      address: place.formatted_address,
      placeId: place.place_id,
      neighborhood: area.name,
    },

    images: {
      urls:
        place.photos?.map(photo => ({
          url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`,
        })) || [],
    },

    openingHours: (place.opening_hours as any) || null,
    availableDays: place.opening_hours?.periods?.map(p => p.open.day) || [],

    googlePlaceId: place.place_id,
    lastSyncedAt: new Date(),
  };

  await prisma.activityRecommendation.upsert({
    where: { googlePlaceId: place.place_id },
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
}

// Helper functions
function determineIndoorOutdoor(
  types: AddressType[],
  name: string,
  description?: string
): IndoorOutdoor {
  if (checkBeachIndicators({ types, name, editorial_summary: { overview: description } })) {
    return 'OUTDOOR';
  }

  const isIndoorShopping = types.some(t => ['shopping_mall', 'department_store'].includes(t));

  if (isIndoorShopping) return 'INDOOR';

  // Check if it's an outdoor market or bazaar
  const nameAndDesc = `${name.toLowerCase()} ${description?.toLowerCase() || ''}`;
  if (
    nameAndDesc.includes('street') ||
    nameAndDesc.includes('outdoor') ||
    nameAndDesc.includes('flea')
  ) {
    return 'OUTDOOR';
  }

  const combinedText = `${name.toLowerCase()} ${description?.toLowerCase() || ''}`;

  const isIndoor = types.some(t =>
    ['museum', 'art_gallery', 'aquarium', 'night_club', 'bar', 'casino'].includes(t)
  );
  const isOutdoor = types.some(t =>
    ['park', 'zoo', 'amusement_park', 'natural_feature'].includes(t)
  );

  // Check if it's a botanical garden with potential indoor areas
  const hasPossibleIndoorAreas =
    Array.from(PARK_TYPES.BOTANICAL).some(term => combinedText.includes(term)) ||
    combinedText.includes('conservatory');

  if (hasPossibleIndoorAreas && isOutdoor) {
    return 'BOTH';
  }

  return isIndoor && isOutdoor ? 'BOTH' : isIndoor ? 'INDOOR' : 'OUTDOOR';
}

function determinePriceLevel(place: Place): PriceLevel {
  const priceLevelMapping: Record<number, PriceLevel> = {
    0: 'FREE',
    1: 'LOW',
    2: 'MODERATE',
    3: 'HIGH',
    4: 'VERY_HIGH',
  };

  return place.price_level !== undefined ? priceLevelMapping[place.price_level] : 'FREE';
}

function determineDuration(place: Place, type: PlaceCategory): number {
  if (type === PlaceCategory.RESTAURANT) {
    const isUpscale = isUpscaleRestaurant(place);
    return isUpscale ? 120 : 90; // 2 hours for upscale, 1.5 hours for standard
  }
  if (type === PlaceCategory.BEACH) {
    return 180; // 3 hours default for beaches
  }
  if (type === PlaceCategory.MUSEUM) return 120;
  if (type === PlaceCategory.SHOPPING) {
    if (
      place.types!.includes(AddressType.shopping_mall) ||
      place.types!.includes(AddressType.department_store)
    ) {
      return 180; // 3 hours for malls & department stores
    }
    return 90; // 1.5 hours for markets and other shopping venues
  }
  if (type === PlaceCategory.PARK) {
    const placeName = place.name!.toLowerCase();
    const description = place.editorial_summary?.overview?.toLowerCase() || '';
    const combinedText = `${placeName} ${description}`;

    // Botanical gardens and large urban parks typically take longer to explore
    const isBotanical = Array.from(PARK_TYPES.BOTANICAL).some(term => combinedText.includes(term));
    const isLargeUrbanPark =
      placeName.includes('central park') ||
      placeName.includes('prospect park') ||
      placeName.includes('golden gate park');

    return isBotanical || isLargeUrbanPark ? 180 : 90;
  }
  if (type === PlaceCategory.NIGHTLIFE) {
    if (place.types!.includes(AddressType.casino)) return 240;
    return 120; // default for other nightlife venues
  }
  if (
    type === PlaceCategory.HISTORIC &&
    place.types!.some(t => ['church', 'synagogue', 'mosque', 'hindu_temple'].includes(t))
  ) {
    return 45;
  }

  const isLargeAttraction = place.types!.some(t =>
    ['amusement_park', 'zoo', 'aquarium'].includes(t)
  );

  return isLargeAttraction ? 180 : 90;
}

// Main population function
async function populateCityData(cityId: string) {
  const city = await prisma.city.findUnique({ where: { id: cityId } });
  if (!city) throw new Error(`City with ID ${cityId} not found`);

  console.log(`Starting comprehensive data sync for ${city.name}...`);

  const existingPlaces = await prisma.activityRecommendation.findMany({
    where: { cityId },
    select: { googlePlaceId: true, lastSyncedAt: true },
  });

  const existingPlaceMap = new Map(existingPlaces.map(p => [p.googlePlaceId, p.lastSyncedAt]));
  const processedPlaceIds = new Set<string>();
  const searchAreas = generateSearchAreas(city);

  const stats = {
    processed: 0,
    added: 0,
    skipped: 0,
    errors: 0,
    byType: {} as Record<PlaceCategory, number>,
    byArea: {} as Record<string, number>,
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
      departments: 0,
    },
    restaurantSubtypes: {
      upscale: 0,
      standard: 0,
    },
  };

  const processPlaceResult = async (place: Place, area: SearchArea): Promise<void> => {
    stats.processed++;
    const placeId = place.place_id!;

    if (processedPlaceIds.has(placeId)) {
      return;
    }
    processedPlaceIds.add(placeId);

    const lastSynced = existingPlaceMap.get(placeId);
    if (lastSynced && new Date() < new Date(lastSynced.getTime() + 30 * 24 * 60 * 60 * 1000)) {
      stats.skipped++;
      return;
    }

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
      const placeType = determinePlaceType(placeDetails);

      if (validatePlace(placeDetails, placeType)) {
        await processPlace(placeDetails, city, placeType, area);
        stats.added++;
        stats.byType[placeType] = (stats.byType[placeType] || 0) + 1;
        stats.byArea[area.name] = (stats.byArea[area.name] || 0) + 1;

        // Track subtypes
        if (placeType === PlaceCategory.RESTAURANT) {
          if (isUpscaleRestaurant(placeDetails)) {
            stats.restaurantSubtypes.upscale++;
          } else {
            stats.restaurantSubtypes.standard++;
          }
        }

        if (placeType === PlaceCategory.PARK) {
          const name = placeDetails.name!.toLowerCase();
          const description = placeDetails.editorial_summary?.overview?.toLowerCase() || '';
          const combinedText = `${name} ${description}`;

          const isBotanical = Array.from(PARK_TYPES.BOTANICAL).some(term =>
            combinedText.includes(term)
          );
          stats.parkSubtypes[isBotanical ? 'botanical' : 'urban']++;
        } else if (placeType === PlaceCategory.BEACH) {
          const name = placeDetails.name!.toLowerCase();
          const isBeach = name.includes('beach') || name.includes('strand');
          stats.beachSubtypes[isBeach ? 'beaches' : 'waterfront']++;
        }

        console.log(`✅ Processed: ${placeDetails.name} (${placeType})`);
      } else if (placeType === PlaceCategory.SHOPPING) {
        if (placeDetails.types!.includes(AddressType.shopping_mall)) {
          stats.shoppingSubtypes.malls++;
        } else if (placeDetails.types!.includes(AddressType.department_store)) {
          stats.shoppingSubtypes.departments++;
        } else {
          stats.shoppingSubtypes.markets++;
        }
      } else {
        stats.skipped++;
        console.log(`Skipped: ${placeDetails.name} - didn't meet ${placeType} criteria`);
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Error processing place:`, error);
      stats.errors++;
    }
  };

  // Main processing loop
  for (const area of searchAreas) {
    console.log(`\nSearching in ${area.name}...`);
    stats.byArea[area.name] = 0;

    // Process regular place types
    for (const placeType of PLACE_TYPES.PRIMARY) {
      try {
        const response = await googleMapsClient.placesNearby({
          params: {
            key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
            location: area.location,
            radius: area.radius,
            type: placeType as AddressType,
            rankby: PlacesNearbyRanking.prominence,
          },
        });

        for (const place of response.data.results) {
          await processPlaceResult(place, area);
        }

        let nextPageToken = response.data.next_page_token;
        while (nextPageToken) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const nextResponse = await googleMapsClient.placesNearby({
            params: {
              key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
              location: area.location,
              radius: area.radius,
              type: placeType as AddressType,
              pagetoken: nextPageToken,
              rankby: PlacesNearbyRanking.prominence,
            },
          });

          for (const place of nextResponse.data.results) {
            await processPlaceResult(place, area);
          }

          nextPageToken = nextResponse.data.next_page_token;
        }
      } catch (error) {
        console.error(`Error fetching ${placeType} places:`, error);
        stats.errors++;
      }
    }

    // Process beaches if city is coastal
    if (isCityCoastal(city)) {
      console.log(`\nSearching for beaches and waterfront locations in ${area.name}...`);

      for (const placeType of PLACE_TYPES.BEACH_SEARCH) {
        try {
          const beachQueries = [
            { keyword: 'beach' },
            { keyword: 'waterfront' },
            { keyword: 'pier' },
            { keyword: 'boardwalk' },
            { keyword: 'harbor' },
          ];

          for (const query of beachQueries) {
            const response = await googleMapsClient.placesNearby({
              params: {
                key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
                location: area.location,
                radius: area.radius,
                type: placeType as AddressType,
                keyword: query.keyword,
                rankby: PlacesNearbyRanking.prominence,
              },
            });

            for (const place of response.data.results) {
              await processPlaceResult(place, area);
            }

            let nextPageToken = response.data.next_page_token;
            while (nextPageToken) {
              await new Promise(resolve => setTimeout(resolve, 2000));
              const nextResponse = await googleMapsClient.placesNearby({
                params: {
                  key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
                  location: area.location,
                  radius: area.radius,
                  type: placeType as AddressType,
                  keyword: query.keyword,
                  pagetoken: nextPageToken,
                  rankby: PlacesNearbyRanking.prominence,
                },
              });

              for (const place of nextResponse.data.results) {
                await processPlaceResult(place, area);
              }

              nextPageToken = nextResponse.data.next_page_token;
            }
          }
        } catch (error) {
          console.error(`Error fetching beach/waterfront places:`, error);
          stats.errors++;
        }
      }
    }
  }

  // Print final statistics
  console.log('\nSync completed!');
  console.log('Statistics:');
  console.log(`Total processed: ${stats.processed}`);
  console.log(`Added/Updated: ${stats.added}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);

  console.log('\nBy Type:');
  Object.entries(stats.byType)
    .sort(([, a], [, b]) => b - a)
    .forEach(([type, count]) => {
      console.log(`${type}: ${count}`);
    });

  if (stats.byType[PlaceCategory.PARK] > 0) {
    console.log('\nPark Subtypes:');
    console.log(`Botanical Gardens/Arboretums: ${stats.parkSubtypes.botanical}`);
    console.log(`Urban Parks: ${stats.parkSubtypes.urban}`);
  }

  if (stats.byType[PlaceCategory.BEACH] > 0) {
    console.log('\nBeach/Waterfront Subtypes:');
    console.log(`Beaches: ${stats.beachSubtypes.beaches}`);
    console.log(`Waterfront Locations: ${stats.beachSubtypes.waterfront}`);
  }

  if (stats.byType[PlaceCategory.SHOPPING] > 0) {
    console.log('\nShopping Subtypes:');
    console.log(`Shopping Malls: ${stats.shoppingSubtypes.malls}`);
    console.log(`Department Stores: ${stats.shoppingSubtypes.departments}`);
    console.log(`Markets: ${stats.shoppingSubtypes.markets}`);
  }

  if (stats.byType[PlaceCategory.RESTAURANT] > 0) {
    console.log('\nRestaurant Subtypes:');
    console.log(`Upscale Restaurants: ${stats.restaurantSubtypes.upscale}`);
    console.log(`Standard Restaurants: ${stats.restaurantSubtypes.standard}`);
  }

  console.log('\nBy Area:');
  Object.entries(stats.byArea)
    .sort(([, a], [, b]) => b - a)
    .forEach(([area, count]) => {
      console.log(`${area}: ${count}`);
    });
}

async function main() {
  const cityId = process.argv[2];
  if (!cityId) {
    throw new Error('Please provide a city ID as an argument');
  }

  try {
    console.log('Starting NYC data sync...');
    console.log(
      `API Key status: ${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing'}`
    );

    // Track API calls
    const apiCalls = {
      placesNearby: 0,
      placeDetails: 0,
      total: 0,
    };

    // Add API call tracking to your functions
    const originalPlacesNearby = googleMapsClient.placesNearby;
    googleMapsClient.placesNearby = async (...args) => {
      apiCalls.placesNearby++;
      apiCalls.total++;
      console.log(`Places API calls: ${apiCalls.total}`);
      return originalPlacesNearby.apply(googleMapsClient, args);
    };

    const originalPlaceDetails = googleMapsClient.placeDetails;
    googleMapsClient.placeDetails = async (...args) => {
      apiCalls.placeDetails++;
      apiCalls.total++;
      console.log(`Places API calls: ${apiCalls.total}`);
      return originalPlaceDetails.apply(googleMapsClient, args);
    };

    await populateCityData(cityId);

    console.log('\nAPI Usage Summary:');
    console.log(`Places Nearby API calls: ${apiCalls.placesNearby}`);
    console.log(`Place Details API calls: ${apiCalls.placeDetails}`);
    console.log(`Total API calls: ${apiCalls.total}`);
  } catch (error) {
    console.error('Error in main:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
