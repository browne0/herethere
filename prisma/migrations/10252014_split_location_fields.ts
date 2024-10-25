// prisma/migrations/[timestamp]_split_location_fields.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function up() {
  // 1. Add new columns (Prisma will do this automatically from schema)

  // 2. Migrate existing data
  const activities = await prisma.activity.findMany({
    select: {
      id: true,
      location: true,
    },
  });

  // 3. Update each activity with the split location data
  for (const activity of activities) {
    const location = activity.location as {
      address?: string;
      latitude?: number;
      longitude?: number;
    } | null;

    await prisma.activity.update({
      where: { id: activity.id },
      data: {
        address: location?.address || '',
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
      },
    });
  }

  // 4. Remove the old location column
  await prisma.$executeRaw`ALTER TABLE "Activity" DROP COLUMN "location";`;
}

export async function down() {
  // 1. Add back the location column
  await prisma.$executeRaw`ALTER TABLE "Activity" ADD COLUMN "location" JSONB;`;

  // 2. Migrate data back to JSON format
  const activities = await prisma.activity.findMany({
    select: {
      id: true,
      address: true,
      latitude: true,
      longitude: true,
    },
  });

  // 3. Update each activity, combining fields back into JSON
  for (const activity of activities) {
    const location = {
      address: activity.address,
      ...(activity.latitude && { latitude: activity.latitude }),
      ...(activity.longitude && { longitude: activity.longitude }),
    };

    await prisma.$executeRaw`
      UPDATE "Activity"
      SET "location" = ${JSON.stringify(location)}::jsonb
      WHERE id = ${activity.id};
    `;
  }

  // 4. Drop the split columns
  await prisma.$executeRaw`
    ALTER TABLE "Activity" 
    DROP COLUMN "address",
    DROP COLUMN "latitude",
    DROP COLUMN "longitude";
  `;
}
