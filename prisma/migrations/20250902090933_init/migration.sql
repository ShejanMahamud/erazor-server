/*
  Warnings:

  - The `verified` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."VerificationStatus" AS ENUM ('transferable', 'verified', 'unverified', 'expired', 'failed');

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "verified",
ADD COLUMN     "verified" "public"."VerificationStatus" NOT NULL DEFAULT 'unverified';
