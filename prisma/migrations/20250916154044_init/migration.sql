/*
  Warnings:

  - You are about to drop the column `userId` on the `images` table. All the data in the column will be lost.
  - Added the required column `ownerId` to the `images` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."images" DROP CONSTRAINT "images_userId_fkey";

-- DropIndex
DROP INDEX "public"."images_userId_idx";

-- AlterTable
ALTER TABLE "public"."images" DROP COLUMN "userId",
ADD COLUMN     "ownerId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "images_ownerId_idx" ON "public"."images"("ownerId");

-- AddForeignKey
ALTER TABLE "public"."images" ADD CONSTRAINT "images_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
