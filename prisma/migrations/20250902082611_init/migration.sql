/*
  Warnings:

  - You are about to drop the column `provider` on the `login_history` table. All the data in the column will be lost.
  - Added the required column `sessionId` to the `login_history` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."login_history_provider_idx";

-- AlterTable
ALTER TABLE "public"."login_history" DROP COLUMN "provider",
ADD COLUMN     "sessionId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "login_history_sessionId_idx" ON "public"."login_history"("sessionId");
