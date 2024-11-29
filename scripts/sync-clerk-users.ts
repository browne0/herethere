import { createClerkClient } from '@clerk/backend';

import { prisma } from '../lib/db';

async function syncDevUsers() {
  try {
    // Get all users from Clerk
    const clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY!,
    });

    const clerkUsers = await clerkClient.users.getUserList();

    // Create a Set of Clerk user IDs for efficient lookup
    const clerkUserIds = new Set(clerkUsers.data.map(user => user.id));

    // Get all users from the database
    const dbUsers = await prisma.user.findMany({
      select: { id: true },
    });

    // Find users that exist in DB but not in Clerk
    const usersToDelete = dbUsers.filter(dbUser => !clerkUserIds.has(dbUser.id));

    // Delete users that don't exist in Clerk
    if (usersToDelete.length > 0) {
      console.log(`Found ${usersToDelete.length} users to delete`);

      // Delete related records first due to foreign key constraints
      for (const user of usersToDelete) {
        // Delete all trips and their related activities
        const userTrips = await prisma.trip.findMany({
          where: { userId: user.id },
          select: { id: true },
        });

        for (const trip of userTrips) {
          // Delete itinerary activities for this trip
          await prisma.itineraryActivity.deleteMany({
            where: { tripId: trip.id },
          });
        }

        // Delete the trips
        await prisma.trip.deleteMany({
          where: { userId: user.id },
        });

        // Finally delete the user
        await prisma.user.delete({
          where: { id: user.id },
        });
      }

      console.log(`Successfully deleted ${usersToDelete.length} users and their related data`);
    }

    // Sync existing Clerk users to the database
    let updatedCount = 0;
    let createdCount = 0;

    for (const user of clerkUsers.data) {
      const result = await prisma.user.upsert({
        where: { id: user.id },
        create: {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress || '',
          firstName: user.firstName,
          lastName: user.lastName,
          profileImage: user.imageUrl,
        },
        update: {
          email: user.emailAddresses[0]?.emailAddress || '',
          firstName: user.firstName,
          lastName: user.lastName,
          profileImage: user.imageUrl,
        },
      });

      if (result.createdAt === result.updatedAt) {
        createdCount++;
      } else {
        updatedCount++;
      }
    }

    console.log(`Sync complete:
- Created: ${createdCount} users
- Updated: ${updatedCount} users
- Deleted: ${usersToDelete.length} users`);
  } catch (error) {
    console.error('Error syncing users:', error);
    throw error; // Re-throw to ensure the script fails visibly
  }
}

// Run the sync
syncDevUsers().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
