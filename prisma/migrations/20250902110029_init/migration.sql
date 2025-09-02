/*
  Warnings:

  - A unique constraint covering the columns `[email,clerkId,username]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "users_email_clerkId_username_key" ON "public"."users"("email", "clerkId", "username");
