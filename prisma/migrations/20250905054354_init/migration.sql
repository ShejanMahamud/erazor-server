/*
  Warnings:

  - You are about to drop the column `userId` on the `login_history` table. All the data in the column will be lost.
  - You are about to drop the `user_roles` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."user_roles" DROP CONSTRAINT "user_roles_userId_fkey";

-- AlterTable
ALTER TABLE "public"."login_history" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "role" "public"."Roles" NOT NULL DEFAULT 'USER';

-- DropTable
DROP TABLE "public"."user_roles";
