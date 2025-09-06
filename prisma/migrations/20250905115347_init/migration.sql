/*
  Warnings:

  - You are about to drop the `login_history` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[polarCustomerId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `polarCustomerId` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."login_history" DROP CONSTRAINT "login_history_userId_fkey";

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "polarCustomerId" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."login_history";

-- CreateIndex
CREATE UNIQUE INDEX "users_polarCustomerId_key" ON "public"."users"("polarCustomerId");
