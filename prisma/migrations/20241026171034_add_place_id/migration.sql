/*
  Warnings:

  - Made the column `latitude` on table `activity` required. This step will fail if there are existing NULL values in that column.
  - Made the column `longitude` on table `activity` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `placeId` to the `trip` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "activity_latitude_longitude_idx";

-- AlterTable
ALTER TABLE "activity" ADD COLUMN     "placeId" TEXT,
ALTER COLUMN "address" DROP DEFAULT,
ALTER COLUMN "latitude" SET NOT NULL,
ALTER COLUMN "longitude" SET NOT NULL;

-- AlterTable
ALTER TABLE "trip" ADD COLUMN     "cityBounds" JSONB,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "placeId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "trip_share" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_share_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trip_share_tripId_idx" ON "trip_share"("tripId");

-- CreateIndex
CREATE INDEX "trip_share_userId_idx" ON "trip_share"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "trip_share_tripId_userId_key" ON "trip_share"("tripId", "userId");

-- AddForeignKey
ALTER TABLE "trip_share" ADD CONSTRAINT "trip_share_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
