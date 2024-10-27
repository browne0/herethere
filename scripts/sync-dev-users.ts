import { createClerkClient } from '@clerk/backend';

import { prisma } from '../lib/db';

async function syncDevUsers() {
  try {
    // Get all users from Clerk

    const clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY!,
    });

    const clerkUsers = await clerkClient.users.getUserList();

    // Sync each user to the database
    for (const user of clerkUsers.data) {
      await prisma.user.upsert({
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
    }

    console.log(`Successfully synced ${clerkUsers.data.length} users`);
  } catch (error) {
    console.error('Error syncing users:', error);
  }
}

// Run the sync
syncDevUsers();
