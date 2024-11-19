// prisma/seed/activities.ts
const path = require('path');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { config } = require('dotenv');

config({ path: path.resolve(process.cwd(), '.env.local') });

interface ActivitySeed {
  name: string;
  description: string;
  type: string;
  category: string;
  duration: number; // in minutes
  price: number; // in cents
  location: any; // JSON
  images: any; // JSON
  rating: number;
  reviewCount: number;
  availableDays: any; // JSON
  openingHours: any; // JSON
  seasonality: any; // JSON
  tags: any; // JSON
}

const NYC_ACTIVITIES: ActivitySeed[] = [
  // Sightseeing & Tours
  {
    name: 'New York graffiti chronicles with Inkhead',
    description:
      'Explore the vibrant street art scene in Brooklyn with local artists. Learn about techniques, history, and the stories behind the murals.',
    type: 'tour',
    category: 'cultural',
    duration: 90,
    price: 4500,
    location: JSON.stringify({
      latitude: 40.7093358,
      longitude: -73.9445549,
      address: 'Bushwick, Brooklyn, NY',
      placeId: 'ChIJcd6/Rf9bwokRXG8uPHNiqok',
    }),
    images: JSON.stringify({
      urls: ['graffiti-tour-1.jpg', 'graffiti-tour-2.jpg'],
    }),
    rating: 5.0,
    reviewCount: 33,
    availableDays: JSON.stringify({ days: [1, 2, 3, 4, 5, 6] }),
    openingHours: JSON.stringify({
      periods: [{ open: { day: 0, time: '1000' }, close: { day: 0, time: '1700' } }],
    }),
    seasonality: JSON.stringify({ seasons: ['spring', 'summer', 'fall'] }),
    tags: JSON.stringify({ tags: ['art', 'walking', 'photography', 'culture', 'local-expert'] }),
  },
  {
    name: 'DUMBO/Brooklyn Bridge photo walk',
    description:
      'Capture stunning photos of the Brooklyn Bridge and Manhattan skyline with a professional photographer. Perfect for all skill levels.',
    type: 'photography',
    category: 'outdoor',
    duration: 60,
    price: 9900,
    location: JSON.stringify({
      latitude: 40.7024,
      longitude: -73.9875,
      address: 'DUMBO, Brooklyn, NY',
      placeId: 'ChIJnw8DN1JawokRpGf7ZN3Jcqs',
    }),
    images: JSON.stringify({
      urls: ['dumbo-photo-1.jpg', 'dumbo-photo-2.jpg'],
    }),
    rating: 4.9,
    reviewCount: 487,
    availableDays: JSON.stringify({ days: [0, 1, 2, 3, 4, 5, 6] }),
    openingHours: JSON.stringify({
      periods: [{ open: { day: 0, time: '0600' }, close: { day: 0, time: '2000' } }],
    }),
    seasonality: JSON.stringify({ seasons: ['spring', 'summer', 'fall', 'winter'] }),
    tags: JSON.stringify({
      tags: ['photography', 'walking', 'views', 'architecture', 'professional'],
    }),
  },
  {
    name: 'Times Square Night-time Holiday Edition Photoshoot',
    description:
      'Experience the magic of Times Square at night with a professional photographer capturing your moments.',
    type: 'photography',
    category: 'nightlife',
    duration: 60,
    price: 6900,
    location: JSON.stringify({
      latitude: 40.758,
      longitude: -73.9855,
      address: 'Times Square, Manhattan, NY',
      placeId: 'ChIJmQJIxlVYwokRLgeuocVOGVU',
    }),
    images: JSON.stringify({
      urls: ['times-square-night-1.jpg', 'times-square-night-2.jpg'],
    }),
    rating: 4.99,
    reviewCount: 369,
    availableDays: JSON.stringify({ days: [0, 1, 2, 3, 4, 5, 6] }),
    openingHours: JSON.stringify({
      periods: [{ open: { day: 0, time: '1900' }, close: { day: 0, time: '2300' } }],
    }),
    seasonality: JSON.stringify({ seasons: ['winter'] }),
    tags: JSON.stringify({ tags: ['photography', 'nightlife', 'city-lights', 'professional'] }),
  },
  // Food & Drink
  {
    name: 'Lower East Side Food Tour',
    description:
      'Taste your way through the historic Lower East Side, sampling delicious specialties from historic shops and modern eateries.',
    type: 'food',
    category: 'culinary',
    duration: 180,
    price: 8900,
    location: JSON.stringify({
      latitude: 40.7205,
      longitude: -73.987,
      address: 'Lower East Side, Manhattan, NY',
      placeId: 'ChIJc9pqWxBZwokRi1MhQewHxxw',
    }),
    images: JSON.stringify({
      urls: ['les-food-1.jpg', 'les-food-2.jpg'],
    }),
    rating: 4.8,
    reviewCount: 892,
    availableDays: JSON.stringify({ days: [1, 2, 3, 4, 5, 6] }),
    openingHours: JSON.stringify({
      periods: [{ open: { day: 0, time: '1100' }, close: { day: 0, time: '1500' } }],
    }),
    seasonality: JSON.stringify({ seasons: ['spring', 'summer', 'fall', 'winter'] }),
    tags: JSON.stringify({ tags: ['food', 'walking', 'history', 'local-cuisine'] }),
  },
  // Museums & Culture
  {
    name: 'MoMA Skip-the-Line Art Tour',
    description:
      'Skip the lines and explore modern art masterpieces with an expert guide at the Museum of Modern Art.',
    type: 'museum',
    category: 'cultural',
    duration: 120,
    price: 7900,
    location: JSON.stringify({
      latitude: 40.7614,
      longitude: -73.9776,
      address: '11 W 53rd St, New York, NY',
      placeId: 'ChIJKxDbe_lYwokRVf__RdEOk0E',
    }),
    images: JSON.stringify({
      urls: ['moma-tour-1.jpg', 'moma-tour-2.jpg'],
    }),
    rating: 4.9,
    reviewCount: 1245,
    availableDays: JSON.stringify({ days: [2, 3, 4, 5, 6, 0] }),
    openingHours: JSON.stringify({
      periods: [{ open: { day: 0, time: '1000' }, close: { day: 0, time: '1730' } }],
    }),
    seasonality: JSON.stringify({ seasons: ['spring', 'summer', 'fall', 'winter'] }),
    tags: JSON.stringify({ tags: ['art', 'museum', 'guided-tour', 'indoor', 'skip-line'] }),
  },
  // Active & Outdoor
  {
    name: 'See 30+ Top New York Sights.Fun Guide!',
    description:
      'A comprehensive walking tour covering the best attractions in Manhattan with a knowledgeable local guide.',
    type: 'tour',
    category: 'sightseeing',
    duration: 300,
    price: 4500,
    location: JSON.stringify({
      latitude: 40.7527,
      longitude: -73.9772,
      address: 'Manhattan, NY',
      placeId: 'ChIJYeZuBI9YwokRjMDs_IEyCwo',
    }),
    images: JSON.stringify({
      urls: ['walking-tour-1.jpg', 'walking-tour-2.jpg'],
    }),
    rating: 4.87,
    reviewCount: 1403,
    availableDays: JSON.stringify({ days: [0, 1, 2, 3, 4, 5, 6] }),
    openingHours: JSON.stringify({
      periods: [{ open: { day: 0, time: '0900' }, close: { day: 0, time: '1700' } }],
    }),
    seasonality: JSON.stringify({ seasons: ['spring', 'summer', 'fall'] }),
    tags: JSON.stringify({ tags: ['walking', 'sightseeing', 'history', 'highlights'] }),
  },
  // Local Experiences
  {
    name: 'Brooklyn Craft Beer Crawl',
    description:
      'Visit the best craft breweries in Brooklyn, tasting unique local beers and learning about the brewing process.',
    type: 'food-drink',
    category: 'nightlife',
    duration: 180,
    price: 7500,
    location: JSON.stringify({
      latitude: 40.7185,
      longitude: -73.9631,
      address: 'Williamsburg, Brooklyn, NY',
      placeId: 'ChIJQSrBBv1bwokRbNfFHCnyeYI',
    }),
    images: JSON.stringify({
      urls: ['beer-tour-1.jpg', 'beer-tour-2.jpg'],
    }),
    rating: 4.95,
    reviewCount: 256,
    availableDays: JSON.stringify({ days: [4, 5, 6] }),
    openingHours: JSON.stringify({
      periods: [{ open: { day: 0, time: '1600' }, close: { day: 0, time: '2200' } }],
    }),
    seasonality: JSON.stringify({ seasons: ['spring', 'summer', 'fall', 'winter'] }),
    tags: JSON.stringify({ tags: ['beer', 'nightlife', 'local', 'food-drink'] }),
  },
  // Morning Activities
  {
    name: 'Sunrise Yoga in Central Park',
    description:
      'Start your day with an energizing yoga session in the heart of Central Park with stunning morning views.',
    type: 'wellness',
    category: 'active',
    duration: 75,
    price: 3500,
    location: JSON.stringify({
      latitude: 40.7829,
      longitude: -73.9654,
      address: 'Sheep Meadow, Central Park, NY',
      placeId: 'ChIJhRwB-yFawokR5Phil-QQ3zM',
    }),
    images: JSON.stringify({
      urls: ['yoga-central-park-1.jpg', 'yoga-central-park-2.jpg'],
    }),
    rating: 4.92,
    reviewCount: 184,
    availableDays: JSON.stringify({ days: [1, 3, 5] }), // Mon, Wed, Fri
    openingHours: JSON.stringify({
      periods: [{ open: { day: 0, time: '0600' }, close: { day: 0, time: '0730' } }],
    }),
    seasonality: JSON.stringify({ seasons: ['spring', 'summer', 'fall'] }),
    tags: JSON.stringify({ tags: ['wellness', 'outdoor', 'morning', 'active', 'peaceful'] }),
  },
  {
    name: 'Early Bird Grand Central Tour',
    description:
      'Explore the architectural marvel of Grand Central Terminal before the crowds arrive.',
    type: 'tour',
    category: 'architecture',
    duration: 60,
    price: 3900,
    location: JSON.stringify({
      latitude: 40.7527,
      longitude: -73.9772,
      address: '89 E 42nd St, New York, NY',
      placeId: 'ChIJhRwB-yFawokR5Phil-QQ3zM',
    }),
    images: JSON.stringify({
      urls: ['grand-central-1.jpg', 'grand-central-2.jpg'],
    }),
    rating: 4.85,
    reviewCount: 312,
    availableDays: JSON.stringify({ days: [1, 2, 3, 4, 5] }), // Weekdays
    openingHours: JSON.stringify({
      periods: [{ open: { day: 0, time: '0800' }, close: { day: 0, time: '0900' } }],
    }),
    seasonality: JSON.stringify({ seasons: ['spring', 'summer', 'fall', 'winter'] }),
    tags: JSON.stringify({ tags: ['architecture', 'history', 'morning', 'photography'] }),
  },

  // Afternoon Activities
  {
    name: 'Greenwich Village Food Adventure',
    description:
      'Sample the best pizza, bagels, and local specialties in this historic neighborhood.',
    type: 'food',
    category: 'culinary',
    duration: 180,
    price: 9900,
    location: JSON.stringify({
      latitude: 40.7335,
      longitude: -74.0027,
      address: 'Greenwich Village, New York, NY',
      placeId: 'ChIJhRwB-yFawokR5Phil-QQ3zM',
    }),
    images: JSON.stringify({
      urls: ['greenwich-food-1.jpg', 'greenwich-food-2.jpg'],
    }),
    rating: 4.95,
    reviewCount: 892,
    availableDays: JSON.stringify({ days: [0, 1, 2, 3, 4, 5, 6] }),
    openingHours: JSON.stringify({
      periods: [{ open: { day: 0, time: '1100' }, close: { day: 0, time: '1500' } }],
    }),
    seasonality: JSON.stringify({ seasons: ['spring', 'summer', 'fall', 'winter'] }),
    tags: JSON.stringify({ tags: ['food', 'walking', 'local-cuisine', 'history'] }),
  },
  {
    name: 'High Line Art Walk',
    description:
      "Discover public art installations along Manhattan's elevated park with an art historian.",
    type: 'tour',
    category: 'art',
    duration: 120,
    price: 4500,
    location: JSON.stringify({
      latitude: 40.748,
      longitude: -74.0048,
      address: 'The High Line, New York, NY',
      placeId: 'ChIJhRwB-yFawokR5Phil-QQ3zM',
    }),
    images: JSON.stringify({
      urls: ['highline-art-1.jpg', 'highline-art-2.jpg'],
    }),
    rating: 4.88,
    reviewCount: 445,
    availableDays: JSON.stringify({ days: [2, 4, 6] }), // Tue, Thu, Sat
    openingHours: JSON.stringify({
      periods: [{ open: { day: 0, time: '1400' }, close: { day: 0, time: '1600' } }],
    }),
    seasonality: JSON.stringify({ seasons: ['spring', 'summer', 'fall'] }),
    tags: JSON.stringify({ tags: ['art', 'walking', 'outdoor', 'cultural'] }),
  },

  // Evening Activities
  {
    name: 'Sunset Sail around Manhattan',
    description:
      'Cruise around Manhattan on a classic sailboat while enjoying stunning sunset views.',
    type: 'cruise',
    category: 'luxury',
    duration: 120,
    price: 12900,
    location: JSON.stringify({
      latitude: 40.7046,
      longitude: -74.0169,
      address: 'North Cove Marina, New York, NY',
      placeId: 'ChIJhRwB-yFawokR5Phil-QQ3zM',
    }),
    images: JSON.stringify({
      urls: ['sunset-sail-1.jpg', 'sunset-sail-2.jpg'],
    }),
    rating: 4.97,
    reviewCount: 673,
    availableDays: JSON.stringify({ days: [0, 1, 2, 3, 4, 5, 6] }),
    openingHours: JSON.stringify({
      periods: [{ open: { day: 0, time: '1800' }, close: { day: 0, time: '2000' } }],
    }),
    seasonality: JSON.stringify({ seasons: ['spring', 'summer', 'fall'] }),
    tags: JSON.stringify({ tags: ['sunset', 'romantic', 'views', 'luxury'] }),
  },
  {
    name: 'Harlem Jazz Evening',
    description: 'Experience live jazz at a historic Harlem venue with optional soul food dinner.',
    type: 'entertainment',
    category: 'nightlife',
    duration: 180,
    price: 8900,
    location: JSON.stringify({
      latitude: 40.8116,
      longitude: -73.9465,
      address: 'Harlem, New York, NY',
      placeId: 'ChIJhRwB-yFawokR5Phil-QQ3zM',
    }),
    images: JSON.stringify({
      urls: ['harlem-jazz-1.jpg', 'harlem-jazz-2.jpg'],
    }),
    rating: 4.91,
    reviewCount: 521,
    availableDays: JSON.stringify({ days: [4, 5, 6] }), // Thu, Fri, Sat
    openingHours: JSON.stringify({
      periods: [{ open: { day: 0, time: '1900' }, close: { day: 0, time: '2300' } }],
    }),
    seasonality: JSON.stringify({ seasons: ['spring', 'summer', 'fall', 'winter'] }),
    tags: JSON.stringify({ tags: ['music', 'nightlife', 'cultural', 'food'] }),
  },

  // Budget-Friendly Options
  {
    name: 'Street Art & Murals Walking Tour',
    description: "Explore Bushwick's vibrant street art scene with a local artist guide.",
    type: 'tour',
    category: 'art',
    duration: 90,
    price: 2500,
    location: JSON.stringify({
      latitude: 40.7064,
      longitude: -73.9322,
      address: 'Bushwick, Brooklyn, NY',
      placeId: 'ChIJhRwB-yFawokR5Phil-QQ3zM',
    }),
    images: JSON.stringify({
      urls: ['bushwick-art-1.jpg', 'bushwick-art-2.jpg'],
    }),
    rating: 4.85,
    reviewCount: 367,
    availableDays: JSON.stringify({ days: [0, 6] }), // Sat, Sun
    openingHours: JSON.stringify({
      periods: [{ open: { day: 0, time: '1100' }, close: { day: 0, time: '1230' } }],
    }),
    seasonality: JSON.stringify({ seasons: ['spring', 'summer', 'fall'] }),
    tags: JSON.stringify({ tags: ['art', 'walking', 'budget-friendly', 'photography'] }),
  },
  {
    name: 'Brooklyn Flea Market Tour',
    description: "Hunt for vintage treasures and local crafts at Brooklyn's famous flea markets.",
    type: 'shopping',
    category: 'local',
    duration: 120,
    price: 2900,
    location: JSON.stringify({
      latitude: 40.7103,
      longitude: -73.9496,
      address: 'Williamsburg, Brooklyn, NY',
      placeId: 'ChIJhRwB-yFawokR5Phil-QQ3zM',
    }),
    images: JSON.stringify({
      urls: ['brooklyn-flea-1.jpg', 'brooklyn-flea-2.jpg'],
    }),
    rating: 4.82,
    reviewCount: 234,
    availableDays: JSON.stringify({ days: [6, 0] }), // Weekends only
    openingHours: JSON.stringify({
      periods: [{ open: { day: 0, time: '1000' }, close: { day: 0, time: '1700' } }],
    }),
    seasonality: JSON.stringify({ seasons: ['spring', 'summer', 'fall'] }),
    tags: JSON.stringify({ tags: ['shopping', 'local', 'budget-friendly', 'vintage'] }),
  },

  // Luxury Experiences
  {
    name: 'Helicopter Tour & Champagne',
    description: 'See NYC from above with a private helicopter tour including champagne service.',
    type: 'tour',
    category: 'luxury',
    duration: 45,
    price: 39900,
    location: JSON.stringify({
      latitude: 40.7013,
      longitude: -74.0053,
      address: 'Downtown Manhattan Heliport, New York, NY',
      placeId: 'ChIJhRwB-yFawokR5Phil-QQ3zM',
    }),
    images: JSON.stringify({
      urls: ['heli-tour-1.jpg', 'heli-tour-2.jpg'],
    }),
    rating: 4.98,
    reviewCount: 156,
    availableDays: JSON.stringify({ days: [0, 1, 2, 3, 4, 5, 6] }),
    openingHours: JSON.stringify({
      periods: [{ open: { day: 0, time: '1000' }, close: { day: 0, time: '1800' } }],
    }),
    seasonality: JSON.stringify({ seasons: ['spring', 'summer', 'fall', 'winter'] }),
    tags: JSON.stringify({ tags: ['luxury', 'views', 'romantic', 'unique'] }),
  },
  {
    name: "Private Chef's Table Experience",
    description:
      'Exclusive dining experience with a Michelin-starred chef in their private kitchen.',
    type: 'food',
    category: 'luxury',
    duration: 180,
    price: 49900,
    location: JSON.stringify({
      latitude: 40.7216,
      longitude: -73.9879,
      address: 'Lower East Side, New York, NY',
      placeId: 'ChIJhRwB-yFawokR5Phil-QQ3zM',
    }),
    images: JSON.stringify({
      urls: ['chef-table-1.jpg', 'chef-table-2.jpg'],
    }),
    rating: 4.99,
    reviewCount: 89,
    availableDays: JSON.stringify({ days: [3, 4, 5, 6] }), // Wed-Sat
    openingHours: JSON.stringify({
      periods: [{ open: { day: 0, time: '1800' }, close: { day: 0, time: '2200' } }],
    }),
    seasonality: JSON.stringify({ seasons: ['spring', 'summer', 'fall', 'winter'] }),
    tags: JSON.stringify({ tags: ['food', 'luxury', 'exclusive', 'culinary'] }),
  },

  // Seasonal Activities
  {
    name: 'Central Park Ice Skating',
    description: 'Skate at the iconic Wollman Rink with views of the Manhattan skyline.',
    type: 'activity',
    category: 'seasonal',
    duration: 120,
    price: 4900,
    location: JSON.stringify({
      latitude: 40.7694,
      longitude: -73.9738,
      address: 'Wollman Rink, Central Park, NY',
      placeId: 'ChIJhRwB-yFawokR5Phil-QQ3zM',
    }),
    images: JSON.stringify({
      urls: ['ice-skating-1.jpg', 'ice-skating-2.jpg'],
    }),
    rating: 4.86,
    reviewCount: 892,
    availableDays: JSON.stringify({ days: [0, 1, 2, 3, 4, 5, 6] }),
    openingHours: JSON.stringify({
      periods: [{ open: { day: 0, time: '1000' }, close: { day: 0, time: '2100' } }],
    }),
    seasonality: JSON.stringify({ seasons: ['winter'] }),
    tags: JSON.stringify({ tags: ['winter', 'family-friendly', 'outdoor', 'active'] }),
  },
  {
    name: 'Rooftop Farm & Cooking Class',
    description: 'Visit a Brooklyn rooftop farm and cook with fresh harvested ingredients.',
    type: 'food',
    category: 'educational',
    duration: 180,
    price: 12900,
    location: JSON.stringify({
      latitude: 40.7147,
      longitude: -73.9614,
      address: 'Williamsburg, Brooklyn, NY',
      placeId: 'ChIJhRwB-yFawokR5Phil-QQ3zM',
    }),
    images: JSON.stringify({
      urls: ['rooftop-farm-1.jpg', 'rooftop-farm-2.jpg'],
    }),
    rating: 4.93,
    reviewCount: 167,
    availableDays: JSON.stringify({ days: [6, 0] }), // Weekends only
    openingHours: JSON.stringify({
      periods: [{ open: { day: 0, time: '1000' }, close: { day: 0, time: '1400' } }],
    }),
    seasonality: JSON.stringify({ seasons: ['spring', 'summer'] }),
    tags: JSON.stringify({ tags: ['food', 'educational', 'sustainable', 'hands-on'] }),
  },
  {
    name: 'Natural History Museum Family Tour',
    description: 'Kid-friendly tour of dinosaurs and ocean life with interactive activities.',
    type: 'museum',
    category: 'family',
    duration: 150,
    price: 6900,
    location: JSON.stringify({
      latitude: 40.7813,
      longitude: -73.974,
      address: 'Central Park West & 79th St, New York, NY',
      placeId: 'ChIJCXoPsPRYwokRsV1MYnKBfaI',
    }),
    images: JSON.stringify({
      urls: ['museum-family-1.jpg', 'museum-family-2.jpg'],
    }),
    rating: 4.89,
    reviewCount: 756,
    availableDays: JSON.stringify({ days: [0, 1, 2, 3, 4, 5, 6] }),
    openingHours: JSON.stringify({
      periods: [{ open: { day: 0, time: '1000' }, close: { day: 0, time: '1700' } }],
    }),
    seasonality: JSON.stringify({ seasons: ['spring', 'summer', 'fall', 'winter'] }),
    tags: JSON.stringify({ tags: ['family', 'educational', 'indoor', 'interactive'] }),
  },
  {
    name: 'Central Park Zoo Adventure',
    description: 'Guided tour of Central Park Zoo with special animal encounters.',
    type: 'attraction',
    category: 'family',
    duration: 120,
    price: 4900,
    location: JSON.stringify({
      latitude: 40.7685,
      longitude: -73.9719,
      address: 'East 64th Street, New York, NY',
      placeId: 'ChIJB6xV7K5YwokRJ8Uo9JuqVTE',
    }),
    images: JSON.stringify({
      urls: ['zoo-adventure-1.jpg', 'zoo-adventure-2.jpg'],
    }),
    rating: 4.87,
    reviewCount: 623,
    availableDays: JSON.stringify({ days: [0, 1, 2, 3, 4, 5, 6] }),
    openingHours: JSON.stringify({
      periods: [{ open: { day: 0, time: '1000' }, close: { day: 0, time: '1630' } }],
    }),
    seasonality: JSON.stringify({ seasons: ['spring', 'summer', 'fall'] }),
    tags: JSON.stringify({ tags: ['family', 'animals', 'outdoor', 'kid-friendly'] }),
  },

  // Adventure & Sports
  {
    name: 'Rock Climbing in Brooklyn',
    description: 'Indoor climbing session with professional instruction for all levels.',
    type: 'sport',
    category: 'adventure',
    duration: 120,
    price: 5900,
    location: JSON.stringify({
      latitude: 40.7099,
      longitude: -73.9641,
      address: 'Williamsburg, Brooklyn, NY',
      placeId: 'ChIJK5JxqFZZwokRD9O8_BZFzyo',
    }),
    images: JSON.stringify({
      urls: ['climbing-1.jpg', 'climbing-2.jpg'],
    }),
    rating: 4.92,
    reviewCount: 341,
    availableDays: JSON.stringify({ days: [0, 1, 2, 3, 4, 5, 6] }),
    openingHours: JSON.stringify({
      periods: [{ open: { day: 0, time: '0900' }, close: { day: 0, time: '2200' } }],
    }),
    seasonality: JSON.stringify({ seasons: ['spring', 'summer', 'fall', 'winter'] }),
    tags: JSON.stringify({ tags: ['active', 'indoor', 'sports', 'adventure'] }),
  },
  {
    name: 'Hudson River Kayaking',
    description: 'Guided kayaking tour along the Hudson River with skyline views.',
    type: 'sport',
    category: 'adventure',
    duration: 150,
    price: 7900,
    location: JSON.stringify({
      latitude: 40.727,
      longitude: -74.0089,
      address: 'Pier 84, New York, NY',
      placeId: 'ChIJp0lxXLlZwokRMxM2Zj0bJ8c',
    }),
    images: JSON.stringify({
      urls: ['kayaking-1.jpg', 'kayaking-2.jpg'],
    }),
    rating: 4.88,
    reviewCount: 289,
    availableDays: JSON.stringify({ days: [5, 6] }), // Weekends only
    openingHours: JSON.stringify({
      periods: [{ open: { day: 0, time: '0900' }, close: { day: 0, time: '1600' } }],
    }),
    seasonality: JSON.stringify({ seasons: ['summer'] }),
    tags: JSON.stringify({ tags: ['water-sports', 'outdoor', 'active', 'views'] }),
  },

  // Hidden Gems
  {
    name: 'Secret Speakeasy Cocktail Tour',
    description:
      "Visit hidden bars and learn about NYC's prohibition history while enjoying craft cocktails.",
    type: 'nightlife',
    category: 'hidden-gem',
    duration: 180,
    price: 8900,
    location: JSON.stringify({
      latitude: 40.7298,
      longitude: -73.9915,
      address: 'East Village, New York, NY',
      placeId: 'ChIJrcDTfqpZwokRcFWaOyXQKPE',
    }),
    images: JSON.stringify({
      urls: ['speakeasy-1.jpg', 'speakeasy-2.jpg'],
    }),
    rating: 4.96,
    reviewCount: 423,
    availableDays: JSON.stringify({ days: [4, 5, 6] }), // Thu-Sat
    openingHours: JSON.stringify({
      periods: [{ open: { day: 0, time: '1900' }, close: { day: 0, time: '2300' } }],
    }),
    seasonality: JSON.stringify({ seasons: ['spring', 'summer', 'fall', 'winter'] }),
    tags: JSON.stringify({ tags: ['nightlife', 'cocktails', 'history', 'hidden-gem'] }),
  },
  {
    name: 'Underground Arts Scene Tour',
    description: 'Explore underground galleries and meet local artists in their studios.',
    type: 'art',
    category: 'hidden-gem',
    duration: 150,
    price: 5900,
    location: JSON.stringify({
      latitude: 40.718,
      longitude: -73.9579,
      address: 'Bushwick, Brooklyn, NY',
      placeId: 'ChIJcd6_Rf9bwokRXG8uPHNiqok',
    }),
    images: JSON.stringify({
      urls: ['underground-art-1.jpg', 'underground-art-2.jpg'],
    }),
    rating: 4.91,
    reviewCount: 167,
    availableDays: JSON.stringify({ days: [4, 5, 6] }), // Thu-Sat
    openingHours: JSON.stringify({
      periods: [{ open: { day: 0, time: '1300' }, close: { day: 0, time: '1800' } }],
    }),
    seasonality: JSON.stringify({ seasons: ['spring', 'summer', 'fall', 'winter'] }),
    tags: JSON.stringify({ tags: ['art', 'local', 'hidden-gem', 'cultural'] }),
  },
];

// Add more cities and their activities as needed
const ALL_ACTIVITIES = [...NYC_ACTIVITIES];

async function main() {
  console.log('Start seeding activity recommendations...');

  try {
    // Clear existing activities
    await prisma.activityRecommendation.deleteMany();
    console.log('Cleared existing activities');

    // Create new activities
    for (const activity of ALL_ACTIVITIES) {
      const created = await prisma.activityRecommendation.create({
        data: activity,
      });
      console.log(`Created activity: ${created.name} (${created.id})`);
    }

    console.log('Seeding completed successfully');
  } catch (error) {
    console.error('Error seeding activities:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
