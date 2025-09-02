/*
  Warnings:

  - Changed the type of `lastSignInAt` on the `login_history` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "public"."login_history" DROP COLUMN "lastSignInAt",
ADD COLUMN     "lastSignInAt" TIMESTAMP(3) NOT NULL;
