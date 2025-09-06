/*
  Warnings:

  - Added the required column `userId` to the `login_history` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `user_roles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."login_history" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."user_roles" ADD COLUMN     "userId" TEXT NOT NULL;
