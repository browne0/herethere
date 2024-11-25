import {
  AddressType,
  Client as GoogleMapsClient,
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

dotenv.config({ path: ['.env.local'] });

const prisma = new PrismaClient();
const googleMapsClient = new GoogleMapsClient({});

// Quality thresholds
const RATING_TIERS = {
  EXCEPTIONAL: { min: 4.8, reviews: 10000 },
  HIGH: { min: 4.5, reviews: 5000 },
  AVERAGE: { min: 4.0, reviews: 1000 },
  LOW: { min: 0, reviews: 0 },
};

// Place types we're interested in collecting
const PLACE_TYPES = new Set<AddressType>([
  AddressType.tourist_attraction,
  AddressType.museum,
  AddressType.art_gallery,
  AddressType.park,
  AddressType.church,
  AddressType.synagogue,
  AddressType.mosque,
  AddressType.hindu_temple,
  AddressType.landmark,
  AddressType.aquarium,
  AddressType.zoo,
  AddressType.amusement_park,
  AddressType.natural_feature,
]);

// City size configuration
interface CityConfig {
  searchPattern: 'SINGLE_POINT' | 'GRID' | 'MULTI_AREA';
  baseRadius: number; // in meters
  minRating: number;
  minReviews: number;
}

const CITY_SIZES: Record<'MAJOR' | 'MEDIUM' | 'SMALL', CityConfig> = {
  MAJOR: {
    searchPattern: 'MULTI_AREA',
    baseRadius: 2000,
    minRating: 4.3,
    minReviews: 1000,
  },
  MEDIUM: {
    searchPattern: 'GRID',
    baseRadius: 3000,
    minRating: 4.2,
    minReviews: 500,
  },
  SMALL: {
    searchPattern: 'SINGLE_POINT',
    baseRadius: 5000,
    minRating: 4.0,
    minReviews: 250,
  },
};

interface SearchArea {
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  radius: number;
}

const QUALITY_THRESHOLDS = {
  MIN_RATING: 4.3,
  MIN_REVIEWS: 1000,
  EXCEPTIONAL_RATING: 4.7,
  EXCEPTIONAL_REVIEWS: 5000,
};

const BLACKLISTED_TYPES = new Set([
  'restaurant',
  'food',
  'store',
  'shopping_mall',
  'clothing_store',
  'furniture_store',
  'grocery_store',
  'supermarket',
  'cafe',
  'bakery',
  'bar',
  'night_club',
  'lodging',
  'hotel',
  'gym',
  'health',
  'beauty_salon',
  'spa',
  'pharmacy',
  'doctor',
  'dentist',
  'bank',
  'finance',
  'real_estate_agency',
  'insurance_agency',
  'car_dealer',
  'car_rental',
  'car_repair',
  'car_wash',
  'gas_station',
  'parking',
  'subway_station',
  'train_station',
  'transit_station',
]);

const PRIMARY_ATTRACTION_TYPES = new Set([
  'tourist_attraction',
  'museum',
  'art_gallery',
  'aquarium',
  'amusement_park',
  'park',
  'church',
  'place_of_worship',
  'stadium',
  'zoo',
  'landmark',
]);

function validatePlaceDetails(details: Place): boolean {
  // Must have basic required fields
  if (!details?.name || !details?.geometry?.location) {
    console.log(`Skipping ${details?.name || 'unnamed'} - missing basic details`);
    return false;
  }

  // Must have photos
  if (!details.photos || details.photos.length === 0) {
    console.log(`Skipping ${details.name} - no photos`);
    return false;
  }

  // Must have ratings that meet our thresholds
  if (!details.rating || !details.user_ratings_total) {
    console.log(`Skipping ${details.name} - missing ratings`);
    return false;
  }

  const isExceptional =
    details.rating >= QUALITY_THRESHOLDS.EXCEPTIONAL_RATING &&
    details.user_ratings_total >= QUALITY_THRESHOLDS.EXCEPTIONAL_REVIEWS;

  const meetsMinimumQuality =
    details.rating >= QUALITY_THRESHOLDS.MIN_RATING &&
    details.user_ratings_total >= QUALITY_THRESHOLDS.MIN_REVIEWS;

  if (!isExceptional && !meetsMinimumQuality) {
    console.log(`Skipping ${details.name} - doesn't meet quality thresholds`);
    return false;
  }

  return true;
}

// Determine indoor/outdoor from place types
function determineIndoorOutdoor(types: AddressType[]): IndoorOutdoor {
  const isIndoor = types.some(type =>
    [AddressType.museum, AddressType.art_gallery, AddressType.aquarium].includes(type)
  );

  const isOutdoor = types.some(type =>
    [
      AddressType.park,
      AddressType.zoo,
      AddressType.amusement_park,
      AddressType.natural_feature,
    ].includes(type)
  );

  return isIndoor && isOutdoor ? 'BOTH' : isIndoor ? 'INDOOR' : 'OUTDOOR';
}

// Calculate rating tier based on rating and review count
function calculateRatingTier(rating: number, reviewCount: number): RatingTier {
  if (rating >= RATING_TIERS.EXCEPTIONAL.min && reviewCount >= RATING_TIERS.EXCEPTIONAL.reviews) {
    return 'EXCEPTIONAL';
  }
  if (rating >= RATING_TIERS.HIGH.min && reviewCount >= RATING_TIERS.HIGH.reviews) {
    return 'HIGH';
  }
  if (rating >= RATING_TIERS.AVERAGE.min && reviewCount >= RATING_TIERS.AVERAGE.reviews) {
    return 'AVERAGE';
  }
  return 'LOW';
}

// Calculate review count tier
function calculateReviewCountTier(reviewCount: number): ReviewCountTier {
  if (reviewCount >= 10000) return 'VERY_HIGH';
  if (reviewCount >= 5000) return 'HIGH';
  if (reviewCount >= 1000) return 'MODERATE';
  return 'LOW';
}

// Determine if a place is must-see
function determineMustSee(
  place: any,
  ratingTier: RatingTier,
  reviewCountTier: ReviewCountTier
): boolean {
  const isPrimaryAttraction = place.types.some(type =>
    PRIMARY_ATTRACTION_TYPES.has(type as AddressType)
  );

  if (
    !isPrimaryAttraction &&
    !(
      place.rating >= QUALITY_THRESHOLDS.EXCEPTIONAL_RATING &&
      place.user_ratings_total >= QUALITY_THRESHOLDS.EXCEPTIONAL_REVIEWS
    )
  ) {
    return false;
  }

  // Must-see if exceptionally rated with lots of reviews
  const hasExceptionalRatings = ratingTier === 'EXCEPTIONAL' && reviewCountTier === 'VERY_HIGH';

  // Or highly rated tourist attraction
  const isHighlyRatedAttraction =
    ratingTier === 'HIGH' &&
    reviewCountTier === 'HIGH' &&
    place.types.includes(AddressType.tourist_attraction);

  // Or major landmark with lots of reviews
  const isSignificantLandmark =
    place.types.includes(AddressType.landmark) && reviewCountTier === 'VERY_HIGH';

  return hasExceptionalRatings || isHighlyRatedAttraction || isSignificantLandmark;
}

function determineCitySize(city: any): 'MAJOR' | 'MEDIUM' | 'SMALL' {
  const MAJOR_CITIES = new Set([
    'new york-US',
    'london-GB',
    'paris-FR',
    'tokyo-JP',
    'rome-IT',
    'barcelona-ES',
  ]);

  const cityKey = `${city.name.toLowerCase()}-${city.countryCode}`;

  if (MAJOR_CITIES.has(cityKey)) {
    return 'MAJOR';
  }

  return 'MEDIUM';
}

function generateSearchAreas(city: City): SearchArea[] {
  const citySize = determineCitySize(city);
  const config = CITY_SIZES[citySize];

  // Check for predefined areas first
  const predefinedAreas = PREDEFINED_CITY_AREAS[city.name];
  if (predefinedAreas) {
    return predefinedAreas.map(area => ({
      ...area,
      radius: area.radius || config.baseRadius,
    }));
  }

  // Otherwise, use appropriate search pattern
  switch (config.searchPattern) {
    case 'SINGLE_POINT':
      return [
        {
          name: city.name,
          location: { lat: city.latitude, lng: city.longitude },
          radius: config.baseRadius,
        },
      ];

    case 'GRID': {
      const areas: SearchArea[] = [];
      const gridSize = citySize === 'MAJOR' ? 3 : 2;
      const offset = (config.baseRadius * 1.5) / 111300; // Convert meters to degrees

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

    default:
      return [
        {
          name: city.name,
          location: { lat: city.latitude, lng: city.longitude },
          radius: config.baseRadius,
        },
      ];
  }
}

// Predefined areas for major cities
const PREDEFINED_CITY_AREAS: Record<string, SearchArea[]> = {
  'New York': [
    {
      name: 'Midtown Manhattan',
      location: { lat: 40.7549, lng: -73.984 },
      radius: 2000,
    },
    {
      name: 'Lower Manhattan',
      location: { lat: 40.7128, lng: -74.006 },
      radius: 2000,
    },
    {
      name: 'Upper East Side',
      location: { lat: 40.7736, lng: -73.9566 },
      radius: 2000,
    },
    {
      name: 'Upper West Side',
      location: { lat: 40.787, lng: -73.9754 },
      radius: 2000,
    },
    {
      name: 'Harlem',
      location: { lat: 40.8116, lng: -73.9465 },
      radius: 2000,
    },
    {
      name: 'East Harlem',
      location: { lat: 40.7957, lng: -73.9389 },
      radius: 1500,
    },
    {
      name: 'Washington Heights',
      location: { lat: 40.8417, lng: -73.9394 },
      radius: 2000,
    },
    {
      name: 'Chelsea',
      location: { lat: 40.7465, lng: -74.0014 },
      radius: 1500,
    },
    {
      name: 'Greenwich Village',
      location: { lat: 40.7336, lng: -74.0027 },
      radius: 1500,
    },
    {
      name: 'SoHo',
      location: { lat: 40.7243, lng: -74.0018 },
      radius: 1500,
    },
    {
      name: 'Tribeca',
      location: { lat: 40.7163, lng: -74.0086 },
      radius: 1500,
    },
    {
      name: 'Financial District',
      location: { lat: 40.7075, lng: -74.0113 },
      radius: 1500,
    },
    {
      name: 'Chinatown',
      location: { lat: 40.7158, lng: -73.997 },
      radius: 1000,
    },
    {
      name: 'Little Italy',
      location: { lat: 40.7191, lng: -73.9973 },
      radius: 1000,
    },
    {
      name: 'Flatiron District',
      location: { lat: 40.7401, lng: -73.9903 },
      radius: 1500,
    },
    {
      name: 'Hells Kitchen',
      location: { lat: 40.7638, lng: -73.9918 },
      radius: 1500,
    },
    {
      name: 'Battery Park City',
      location: { lat: 40.7115, lng: -74.0156 },
      radius: 1000,
    },
  ],
  // Add more cities as needed
};

async function populateAttractions(cityId: string) {
  const city = await prisma.city.findUnique({
    where: { id: cityId },
  });

  if (!city) {
    throw new Error(`City with ID ${cityId} not found`);
  }

  console.log(`Starting attraction sync for ${city.name}...`);

  const searchAreas = generateSearchAreas(city);
  const processedPlaceIds = new Set<string>();

  const stats = {
    processed: 0,
    added: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    byRatingTier: {} as Record<RatingTier, number>,
    byPlaceType: {} as Record<string, number>,
    byArea: {} as Record<string, number>,
  };

  for (const area of searchAreas) {
    console.log(`\nSearching in ${area.name}...`);
    stats.byArea[area.name] = 0;

    for (const placeType of PLACE_TYPES) {
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

            // Skip if no rating or reviews
            if (!validatePlaceDetails(placeDetails)) {
              stats.skipped++;
              continue;
            }

            // Check if it's a blacklisted type
            const hasBlacklistedType = placeDetails.types.some(type =>
              BLACKLISTED_TYPES.has(type as AddressType)
            );

            // Check if it's a primary attraction
            const isPrimaryAttraction = placeDetails.types.some(type =>
              PRIMARY_ATTRACTION_TYPES.has(type as AddressType)
            );

            // Skip if it's blacklisted and not a primary attraction
            if (hasBlacklistedType && !isPrimaryAttraction) {
              console.log(`Skipping ${placeDetails.name} - blacklisted type`);
              stats.skipped++;
              continue;
            }

            if (
              !isPrimaryAttraction &&
              !(
                placeDetails.rating >= QUALITY_THRESHOLDS.EXCEPTIONAL_RATING &&
                placeDetails.user_ratings_total >= QUALITY_THRESHOLDS.EXCEPTIONAL_REVIEWS
              )
            ) {
              console.log(
                `Skipping ${placeDetails.name} - not primary attraction and not exceptional`
              );
              stats.skipped++;
              continue;
            }

            // Calculate quality metrics
            const ratingTier = calculateRatingTier(
              placeDetails.rating,
              placeDetails.user_ratings_total
            );
            const reviewCountTier = calculateReviewCountTier(placeDetails.user_ratings_total);
            const isMustSee = determineMustSee(placeDetails, ratingTier, reviewCountTier);

            // Filter to only supported place types
            const placeTypes = placeDetails.types.filter(type =>
              PLACE_TYPES.has(type as AddressType)
            ) as AddressType[];

            const activityData: Prisma.ActivityRecommendationCreateInput = {
              name: placeDetails.name,
              description:
                placeDetails.editorial_summary?.overview ||
                `Visit ${placeDetails.name}, one of ${city.name}'s attractions.`,
              city: { connect: { id: city.id } },

              rating: placeDetails.rating,
              ratingTier,
              reviewCount: placeDetails.user_ratings_total,
              reviewCountTier,

              isMustSee,
              isTouristAttraction: placeDetails.types.includes(AddressType.tourist_attraction),
              placeTypes,
              googleTypes: placeDetails.types,

              indoorOutdoor: determineIndoorOutdoor(placeTypes),
              duration: 90, // Default duration
              priceLevel: (placeDetails.price_level === undefined
                ? 'FREE'
                : ['FREE', 'LOW', 'MODERATE', 'HIGH', 'VERY_HIGH'][
                    placeDetails.price_level
                  ]) as PriceLevel,

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

            // Update stats
            stats.byRatingTier[ratingTier] = (stats.byRatingTier[ratingTier] || 0) + 1;
            placeTypes.forEach(type => {
              stats.byPlaceType[type] = (stats.byPlaceType[type] || 0) + 1;
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
  // Print final statistics
  console.log('\nSync completed!');
  console.log('Statistics:');
  console.log(`Total processed: ${stats.processed}`);
  console.log(`Added/Updated: ${stats.added}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Errors: ${stats.errors}`);

  console.log('\nBy Rating Tier:');
  Object.entries(stats.byRatingTier)
    .sort(([, a], [, b]) => b - a)
    .forEach(([tier, count]) => {
      console.log(`${tier}: ${count}`);
    });

  console.log('\nBy Place Type:');
  Object.entries(stats.byPlaceType)
    .sort(([, a], [, b]) => b - a)
    .forEach(([type, count]) => {
      console.log(`${type}: ${count}`);
    });

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
    await populateAttractions(cityId);
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

export { populateAttractions };
