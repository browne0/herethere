// test-viator-sync.ts
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

import { ViatorAPI } from '@/lib/viator';

dotenv.config({ path: ['.env.local'] });

const prisma = new PrismaClient();

async function testDestinationSync() {
  try {
    // 1. First just test getting all destinations
    const client = new ViatorAPI();
    const { destinations, totalCount } = await client.getDestinations();

    console.log(`Found ${totalCount} total Viator destinations`);

    // 2. Look specifically for New York
    const nyDest = destinations.find(
      dest => dest.name.toLowerCase().includes('new york') && dest.type.toLowerCase() === 'city'
    );

    if (nyDest) {
      console.log('\nFound New York in Viator destinations:');
      console.log(JSON.stringify(nyDest, null, 2));

      // 3. Try to find it in our database
      const ourNY = await prisma.city.findFirst({
        where: {
          name: {
            contains: 'New York',
            mode: 'insensitive',
          },
        },
      });

      if (ourNY) {
        console.log('\nFound New York in our database:');
        console.log(JSON.stringify(ourNY, null, 2));

        // 4. Update our record with Viator data
        const updated = await prisma.city.update({
          where: { id: ourNY.id },
          data: {
            viatorDestId: nyDest.destinationId,
            viatorLookupId: nyDest.lookupId,
            viatorData: nyDest,
            lastViatorSync: new Date(),
          },
        });

        console.log('\nSuccessfully updated our database:');
        console.log(JSON.stringify(updated, null, 2));
      } else {
        console.log('\nWarning: New York not found in our database');
      }
    } else {
      console.log('Warning: New York not found in Viator destinations');
    }
  } catch (error) {
    console.error('Error during testno:', error);
  }
}

// Run the test
testDestinationSync()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
