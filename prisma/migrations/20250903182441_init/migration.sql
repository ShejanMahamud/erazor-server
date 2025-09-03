/*
  Warnings:

  - A unique constraint covering the columns `[processId]` on the table `images` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "images_processId_key" ON "public"."images"("processId");
