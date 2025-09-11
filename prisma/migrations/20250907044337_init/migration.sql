-- CreateEnum
CREATE TYPE "public"."NotificationTypes" AS ENUM ('INFO', 'WARNING', 'ALERT');

-- CreateEnum
CREATE TYPE "public"."Roles" AS ENUM ('MODERATOR', 'ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "public"."Permissions" AS ENUM ('MANAGE_USERS', 'VIEW_ANALYTICS', 'MANAGE_SUBSCRIPTIONS', 'MANAGE_ROLES', 'DELETE_IMAGES', 'SYSTEM_SETTINGS', 'REVIEW_IMAGES', 'BLOCK_USER', 'REMOVE_CONTENT', 'VIEW_USER_ACTIVITY', 'PROCESS_IMAGES', 'VIEW_OWN_HISTORY');

-- CreateEnum
CREATE TYPE "public"."VerificationStatus" AS ENUM ('transferable', 'verified', 'unverified', 'expired', 'failed');

-- CreateEnum
CREATE TYPE "public"."ImageStatus" AS ENUM ('queue', 'processing', 'ready');

-- CreateTable
CREATE TABLE "public"."users" (
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "role" "public"."Roles" NOT NULL DEFAULT 'USER',
    "verified" "public"."VerificationStatus" NOT NULL DEFAULT 'unverified',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("userId")
);

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

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."NotificationTypes" NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_userId_key" ON "public"."users"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "public"."users"("username");

-- CreateIndex
CREATE INDEX "users_userId_idx" ON "public"."users"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_username_userId_key" ON "public"."users"("email", "username", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "images_processId_key" ON "public"."images"("processId");

-- CreateIndex
CREATE INDEX "images_userId_idx" ON "public"."images"("userId");

-- CreateIndex
CREATE INDEX "images_processId_idx" ON "public"."images"("processId");

-- CreateIndex
CREATE INDEX "images_status_idx" ON "public"."images"("status");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "public"."notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "public"."notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "public"."notifications"("isRead");

-- AddForeignKey
ALTER TABLE "public"."images" ADD CONSTRAINT "images_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
