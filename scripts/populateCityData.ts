import {
  Client as GoogleMapsClient,
  AddressType,
  Place,
} from '@googlemaps/google-maps-services-js';
import {
  PrismaClient,
  Prisma,
  RatingTier,
  ReviewCountTier,
  IndoorOutdoor,
  PriceLevel,
  SeasonalAvailability,
} from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();
const googleMapsClient = new GoogleMapsClient({});

// Place category configurations
const PLACE_CATEGORIES = [
  { name: 'Must-See Attractions', type: 'tourist_attraction' },
  { name: 'Museums', type: 'museum' },
  { name: 'Historic Locations', type: 'historic_site' },
];

function determineIndoorOutdoor(types: string[]): IndoorOutdoor {
  const isIndoor = types.some(type => ['museum', 'art_gallery', 'aquarium'].includes(type));
  const isOutdoor = types.some(type =>
    ['park', 'zoo', 'amusement_park', 'natural_feature'].includes(type)
  );

  if (isIndoor && isOutdoor) return 'BOTH';
  if (isIndoor) return 'INDOOR';
  if (isOutdoor) return 'OUTDOOR';
  return 'BOTH';
}

function determineDuration(categoryType: string): number {
  switch (categoryType) {
    case 'tourist_attraction':
      return 120; // 2 hours
    case 'museum':
      return 180; // 3 hours
    case 'park':
      return 60; // 1 hour
    default:
      return 90; // Default to 1.5 hours
  }
}

function determinePriceLevel(detailedPlace: Place): PriceLevel {
  switch (detailedPlace.price_level) {
    case 0:
      return 'FREE';
    case 1:
      return 'LOW';
    case 2:
      return 'MODERATE';
    case 3:
      return 'HIGH';
    case 4:
      return 'VERY_HIGH';
    default:
      return 'FREE';
  }
}

// Fetch existing places from the database
async function fetchExistingPlaces(cityId: string) {
  const existingPlaces = await prisma.activityRecommendation.findMany({
    where: { cityId },
    select: { googlePlaceId: true, lastSyncedAt: true },
  });
  return new Map(existingPlaces.map(place => [place.googlePlaceId, place.lastSyncedAt]));
}

// Fetch places by type and skip already synced places
async function fetchAllPlaces(
  cityId: string,
  cityLocation: { lat: number; lng: number },
  type: string,
  existingPlaces: Map<string | null, Date>
) {
  let nextPageToken: string | undefined = undefined;
  const allResults: any[] = [];

  do {
    const response = await googleMapsClient.placesNearby({
      params: {
        key: process.env.GOOGLE_API_KEY!,
        location: `${cityLocation.lat},${cityLocation.lng}`,
        radius: 5000,
        type,
        pagetoken: nextPageToken,
      },
    });

    for (const place of response.data.results) {
      const lastSyncedAt = existingPlaces.get(place.place_id!);
      if (
        !lastSyncedAt ||
        new Date() > new Date(lastSyncedAt.getTime() + 30 * 24 * 60 * 60 * 1000)
      ) {
        allResults.push(place); // Only include unsynced or outdated places
      }
    }

    nextPageToken = response.data.next_page_token;
    if (nextPageToken) await new Promise(resolve => setTimeout(resolve, 2000)); // Delay for token activation
  } while (nextPageToken);

  return allResults;
}

// Fetch detailed place information
async function fetchPlaceDetails(placeId: string) {
  const response = await googleMapsClient.placeDetails({
    params: {
      key: process.env.GOOGLE_API_KEY!,
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
        'editorial_summary',
      ],
    },
  });
  return response.data.result;
}

// Store or update place in the database
async function storePlace(cityId: string, detailedPlace: Place, category: any) {
  // Calculate rating and review tiers
  const ratingTier: RatingTier =
    detailedPlace.rating! >= 4.7
      ? 'EXCEPTIONAL'
      : detailedPlace.rating! >= 4.5
        ? 'HIGH'
        : detailedPlace.rating! >= 4.0
          ? 'AVERAGE'
          : 'LOW';

  const reviewCountTier: ReviewCountTier =
    detailedPlace.user_ratings_total! >= 5000
      ? 'VERY_HIGH'
      : detailedPlace.user_ratings_total! >= 1000
        ? 'HIGH'
        : detailedPlace.user_ratings_total! >= 500
          ? 'MODERATE'
          : 'LOW';

  // Determine fields for the activity
  const isMustSee = category.type === 'tourist_attraction' && ratingTier === 'EXCEPTIONAL';
  const indoorOutdoor = determineIndoorOutdoor(detailedPlace.types || []);
  const duration = determineDuration(category.type);
  const priceLevel = determinePriceLevel(detailedPlace);

  // Process images
  const images =
    detailedPlace.photos?.map(
      (photo: any) =>
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${process.env.GOOGLE_API_KEY}`
    ) || [];

  // Process opening hours
  const openingHours: any = detailedPlace.opening_hours! || null;

  const seasonalAvailability: SeasonalAvailability =
    detailedPlace.opening_hours!.periods?.length > 0 ? 'SEASONAL' : 'ALL_YEAR';

  // Build data object
  const activityData: Prisma.ActivityRecommendationCreateInput = {
    name: detailedPlace.name!,
    description: `Discover ${detailedPlace.name}, a ${category.name.toLowerCase()} in the area.`,
    city: { connect: { id: cityId } },
    rating: detailedPlace.rating || 0,
    ratingTier,
    reviewCount: detailedPlace.user_ratings_total || 0,
    reviewCountTier,
    isMustSee,
    isTouristAttraction: category.type === 'tourist_attraction',
    placeTypes: detailedPlace.types || [],
    indoorOutdoor,
    duration,
    priceLevel,
    location: {
      latitude: detailedPlace.geometry!.location.lat,
      longitude: detailedPlace.geometry!.location.lng,
      address: detailedPlace.formatted_address,
      neighborhood: detailedPlace.vicinity,
    },
    images: { urls: images },
    openingHours,
    googlePlaceId: detailedPlace.place_id,
    googleTypes: detailedPlace.types || [],
    seasonalAvailability,
    lastSyncedAt: new Date(),
  };

  // Upsert into database
  await prisma.activityRecommendation.upsert({
    where: { googlePlaceId: detailedPlace.place_id },
    create: activityData,
    update: activityData,
  });
}

// Main sync function
async function syncCityData(cityId: string, cityLocation: { lat: number; lng: number }) {
  const existingPlaces = await fetchExistingPlaces(cityId);

  for (const category of PLACE_CATEGORIES) {
    console.log(`Fetching ${category.name}...`);
    const places = await fetchAllPlaces(cityId, cityLocation, category.type, existingPlaces);

    for (const place of places) {
      try {
        const detailedPlace = await fetchPlaceDetails(place.place_id);
        await storePlace(cityId, detailedPlace, category);
        console.log(`✅ Stored: ${detailedPlace.name}`);
      } catch (error) {
        console.error(`Error storing place: ${place.name}`, error);
      }
    }
  }
}

// Main script
async function main() {
  try {
    const cityId = process.argv[2];
    if (!cityId) throw new Error('City ID is required');

    const city = await prisma.city.findUnique({ where: { id: cityId } });
    if (!city) throw new Error('City not found');

    await syncCityData(city.id, { lat: city.latitude, lng: city.longitude });
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
