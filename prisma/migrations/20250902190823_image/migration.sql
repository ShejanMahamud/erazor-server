-- CreateEnum
CREATE TYPE "public"."ImageStatus" AS ENUM ('queue', 'processing', 'ready');

-- CreateTable
CREATE TABLE "public"."images" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "originalImageUrlLQ" TEXT,
    "originalImageUrlHQ" TEXT,
    "bgRemovedFileName" TEXT,
    "bgRemovedImageUrlLQ" TEXT,
    "bgRemovedImageUrlHQ" TEXT,
    "status" "public"."ImageStatus" NOT NULL DEFAULT 'queue',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "images_userId_idx" ON "public"."images"("userId");

-- CreateIndex
CREATE INDEX "images_processId_idx" ON "public"."images"("processId");

-- CreateIndex
CREATE INDEX "images_status_idx" ON "public"."images"("status");
