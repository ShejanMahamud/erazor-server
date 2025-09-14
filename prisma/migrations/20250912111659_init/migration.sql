/*
  Warnings:

  - You are about to drop the column `isActive` on the `subscriptions` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."SubscriptionStatusType" AS ENUM ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid');

-- DropIndex
DROP INDEX "public"."subscriptions_isActive_idx";

-- AlterTable
ALTER TABLE "public"."subscriptions" DROP COLUMN "isActive",
ADD COLUMN     "status" "public"."SubscriptionStatusType" NOT NULL DEFAULT 'incomplete';

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "public"."subscriptions"("status");
