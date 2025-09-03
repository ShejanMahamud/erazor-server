/*
  Warnings:

  - Added the required column `clerkId` to the `images` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."images" ADD COLUMN     "clerkId" TEXT NOT NULL;
