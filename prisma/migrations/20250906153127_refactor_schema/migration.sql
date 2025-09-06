/*
  Warnings:

  - You are about to drop the column `userId` on the `images` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `notifications` table. All the data in the column will be lost.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `polarCustomerId` on the `users` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."notifications" DROP CONSTRAINT "notifications_userId_fkey";

-- DropIndex
DROP INDEX "public"."users_userId_key";

-- DropIndex
DROP INDEX "public"."users_polarCustomerId_key";

-- AlterTable
ALTER TABLE "public"."images" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "public"."notifications" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "public"."users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "id",
DROP COLUMN "polarCustomerId",
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("userId");

-- AddForeignKey
ALTER TABLE "public"."images" ADD CONSTRAINT "images_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
