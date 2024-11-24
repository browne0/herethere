// scripts/populateNYCAttractions.ts
import {
  AddressType,
  Client as GoogleMapsClient,
  PlacesNearbyRanking,
} from '@googlemaps/google-maps-services-js';
import { Prisma, PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

import { ATTRACTION_CATEGORIES, AttractionCategory } from '@/lib/types/attractions';

dotenv.config({ path: ['.env.local'] });

const prisma = new PrismaClient();
const googleMapsClient = new GoogleMapsClient({});

// NYC Areas to search with specific coordinates
const NYC_AREAS = [
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
];

interface TimeSpan {
  open: string;
  close: string;
}

interface DaySchedule {
  day: number;
  isOpen: boolean;
  spans: TimeSpan[];
}

interface OpeningHoursData {
  days: number[];
  fullSchedule: DaySchedule[];
}

interface OpeningPeriod {
  open: { day: number; time: string };
  close: { day: number; time: string };
}

function determineAttractionCategory(placeTypes: string[]): AttractionCategory {
  for (const [categoryId, category] of Object.entries(ATTRACTION_CATEGORIES)) {
    const matches = placeTypes.some(placeType =>
      category.googlePlaceTypes.includes(placeType as AddressType)
    );

    if (matches) {
      return categoryId as AttractionCategory;
    }
  }

  return 'iconic_landmarks' as AttractionCategory;
}

// Helper function to parse opening hours
function parseOpeningHours(
  openingHours: {
    periods: OpeningPeriod[];
    weekday_text?: string[];
  } | null
): OpeningHoursData {
  const defaultSchedule: DaySchedule[] = Array.from({ length: 7 }, (_, i) => ({
    day: i,
    isOpen: false,
    spans: [],
  }));

  if (!openingHours?.periods) {
    return {
      days: [],
      fullSchedule: defaultSchedule,
    };
  }

  const schedule = [...defaultSchedule];
  const availableDays = new Set<number>();

  for (const period of openingHours.periods) {
    const { open, close } = period;

    // Handle 24/7 cases
    if (!close) {
      availableDays.add(open.day);
      schedule[open.day] = {
        day: open.day,
        isOpen: true,
        spans: [{ open: '0000', close: '2359' }],
      };
      continue;
    }

    // Regular opening hours
    if (open.day === close.day) {
      availableDays.add(open.day);
      schedule[open.day] = {
        day: open.day,
        isOpen: true,
        spans: [
          ...(schedule[open.day].spans || []),
          {
            open: open.time,
            close: close.time,
          },
        ],
      };
    } else {
      // Spans multiple days
      let currentDay = open.day;
      while (currentDay !== close.day) {
        availableDays.add(currentDay);
        schedule[currentDay] = {
          day: currentDay,
          isOpen: true,
          spans: [
            ...(schedule[currentDay].spans || []),
            {
              open: currentDay === open.day ? open.time : '0000',
              close: '2359',
            },
          ],
        };
        currentDay = (currentDay + 1) % 7;
      }

      availableDays.add(close.day);
      schedule[close.day] = {
        day: close.day,
        isOpen: true,
        spans: [
          ...(schedule[close.day].spans || []),
          {
            open: '0000',
            close: close.time,
          },
        ],
      };
    }
  }

  return {
    days: Array.from(availableDays).sort((a, b) => a - b),
    fullSchedule: schedule,
  };
}

// Helper function to search places in an area
async function searchPlacesInArea(area: (typeof NYC_AREAS)[0]) {
  const allResults = [];

  for (const category of Object.values(ATTRACTION_CATEGORIES)) {
    for (const placeType of category.googlePlaceTypes) {
      try {
        const response = await googleMapsClient.placesNearby({
          params: {
            key: process.env.GOOGLE_MAPS_API_KEY!,
            location: area.location,
            radius: area.radius,
            type: placeType as AddressType,
            rankby: 'prominence' as PlacesNearbyRanking, // Changed from 'rating'
          },
        });

        if (response.data.results) {
          allResults.push(...response.data.results);
        }

        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error searching for ${placeType} in ${area.name}:`, error);
      }
    }
  }

  return allResults;
}

// Helper function to get detailed place information
async function getPlaceDetails(placeId: string) {
  try {
    const response = await googleMapsClient.placeDetails({
      params: {
        key: process.env.GOOGLE_MAPS_API_KEY!,
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

    return response.data.result;
  } catch (error) {
    console.error(`Error fetching details for place ${placeId}:`, error);
    return null;
  }
}

// Helper to estimate duration based on category and place details
function estimateDuration(category: AttractionCategory, placeDetails: any): number {
  const categoryDuration = ATTRACTION_CATEGORIES[category]?.defaultDuration || 60;

  // Adjust duration based on place type
  if (placeDetails.types.includes('museum')) {
    return 120; // Museums typically take longer
  }
  if (placeDetails.types.includes('park')) {
    return 90; // Parks usually take a moderate amount of time
  }

  return categoryDuration;
}

// Main population function
async function populateNYCAttractions() {
  console.log('Starting NYC attractions sync...');

  const nyc = await prisma.city.upsert({
    where: {
      name_countryCode: {
        name: 'New York City',
        countryCode: 'US',
      },
    },
    create: {
      name: 'New York City',
      countryCode: 'US',
      latitude: 40.7128,
      longitude: -74.006,
      placeId: 'ChIJOwg_06VPwokRYv534QaPC8g',
    },
    update: {}, // No updates if exists
  });

  // Track processed place IDs to avoid duplicates
  const processedPlaceIds = new Set<string>();
  let totalProcessed = 0;
  let totalErrors = 0;

  for (const area of NYC_AREAS) {
    console.log(`\nSearching in ${area.name}...`);
    const places = await searchPlacesInArea(area);
    console.log(`Found ${places.length} potential places in ${area.name}`);

    for (const place of places) {
      // Skip if already processed
      if (processedPlaceIds.has(place.place_id!)) {
        continue;
      }
      processedPlaceIds.add(place.place_id!);

      try {
        const details = await getPlaceDetails(place.place_id!);
        if (!details || !details.geometry?.location) {
          console.log(`Skipping ${place.name} - invalid details`);
          continue;
        }

        // Add null checks
        if (
          !details.rating ||
          !details.user_ratings_total ||
          details.rating < 4.5 ||
          details.user_ratings_total < 1000
        ) {
          continue;
        }

        const category = determineAttractionCategory(details.types || []);
        const categoryDetails = ATTRACTION_CATEGORIES[category];

        const openingHoursData = parseOpeningHours(details.opening_hours as any);

        // Fix the Prisma JSON types
        const activityData: Prisma.ActivityRecommendationCreateInput = {
          id: place.place_id,
          name: place.name!,
          city: {
            connect: {
              id: nyc.id,
            },
          },
          description:
            details.editorial_summary?.overview ??
            `Visit ${place.name}, one of New York City's must-see attractions.`,
          category,
          duration: estimateDuration(category, details),
          price: categoryDetails.typicalPrice,
          location: {
            latitude: details.geometry.location.lat,
            longitude: details.geometry.location.lng,
            address: details.formatted_address,
            placeId: place.place_id,
            neighborhood: area.name,
          } as Prisma.JsonObject,
          images: {
            urls:
              details.photos?.map(photo => ({
                url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${process.env.GOOGLE_MAPS_API_KEY}`,
              })) || [],
          } as Prisma.JsonObject,
          rating: details.rating,
          reviewCount: details.user_ratings_total,
          availableDays: {
            days: openingHoursData.days,
          } as Prisma.JsonObject,
          openingHours: details.opening_hours! as any,
          seasonality: {
            seasons: ['spring', 'summer', 'fall', 'winter'],
          } as Prisma.JsonObject,
          tags: {
            tags: [...details.types!, area.name.toLowerCase().replace(' ', '_')],
          } as Prisma.JsonObject,
        };

        console.log(activityData);

        // await prisma.activityRecommendation.upsert({
        //   where: { id: place.place_id },
        //   create: activityData,
        //   update: {
        //     rating: details.rating,
        //     reviewCount: details.user_ratings_total,
        //     openingHours: activityData.openingHours,
        //     availableDays: activityData.availableDays,
        //     updatedAt: new Date(),
        //   },
        // });

        console.log(`✅ Processed: ${place.name} (${category})`);
        totalProcessed++;

        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`❌ Failed to process ${place.name}:`, error);
        totalErrors++;
      }
    }
  }

  console.log('\nNYC attractions sync completed!');
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`Total errors: ${totalErrors}`);
  console.log(
    `Success rate: ${((totalProcessed / (totalProcessed + totalErrors)) * 100).toFixed(2)}%`
  );
}

// Error handling wrapper
async function main() {
  try {
    await populateNYCAttractions();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { populateNYCAttractions };
