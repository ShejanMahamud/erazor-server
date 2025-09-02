-- CreateEnum
CREATE TYPE "public"."Roles" AS ENUM ('MODERATOR', 'ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "public"."Permissions" AS ENUM ('MANAGE_USERS', 'VIEW_ANALYTICS', 'MANAGE_SUBSCRIPTIONS', 'MANAGE_ROLES', 'DELETE_IMAGES', 'SYSTEM_SETTINGS', 'REVIEW_IMAGES', 'BLOCK_USER', 'REMOVE_CONTENT', 'VIEW_USER_ACTIVITY', 'PROCESS_IMAGES', 'VIEW_OWN_HISTORY');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."login_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "failedAttempt" INTEGER NOT NULL DEFAULT 0,
    "lastSignInAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "login_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."Roles" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "public"."users"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "public"."users"("username");

-- CreateIndex
CREATE INDEX "users_clerkId_idx" ON "public"."users"("clerkId");

-- CreateIndex
CREATE INDEX "login_history_userId_idx" ON "public"."login_history"("userId");

-- CreateIndex
CREATE INDEX "login_history_ipAddress_idx" ON "public"."login_history"("ipAddress");

-- CreateIndex
CREATE INDEX "login_history_userAgent_idx" ON "public"."login_history"("userAgent");

-- CreateIndex
CREATE INDEX "login_history_provider_idx" ON "public"."login_history"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "login_history_userId_key" ON "public"."login_history"("userId");

-- CreateIndex
CREATE INDEX "user_roles_userId_idx" ON "public"."user_roles"("userId");

-- CreateIndex
CREATE INDEX "user_roles_role_idx" ON "public"."user_roles"("role");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_role_key" ON "public"."user_roles"("userId", "role");

-- AddForeignKey
ALTER TABLE "public"."login_history" ADD CONSTRAINT "login_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
