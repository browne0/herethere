// scripts/createCity.ts
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: ['.env.local'] });

const prisma = new PrismaClient();

interface CityInput {
  name: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  placeId: string;
}

async function createCity(input: CityInput) {
  try {
    const city = await prisma.city.create({
      data: input,
    });

    console.log('Created city:', city);
    return city.id;
  } catch (error) {
    console.error('Error creating city:', error);
    throw error;
  }
}

async function main() {
  const [name, countryCode, latitude, longitude, placeId] = process.argv.slice(2);

  if (!name || !countryCode || !latitude || !longitude || !placeId) {
    console.error('Missing arguments. Usage:');
    console.error(
      'npx tsx scripts/createCity.ts "New York City" US 40.7831 -73.9712 ChIJOwg_06VPwokRYv534QaPC8g'
    );
    process.exit(1);
  }

  try {
    const cityId = await createCity({
      name,
      countryCode,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      placeId,
    });

    console.log('Use this city ID for populating attractions:', cityId);
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
