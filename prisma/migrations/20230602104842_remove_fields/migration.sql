/*
  Warnings:

  - You are about to drop the column `main_image` on the `Place` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Place" DROP COLUMN "main_image",
ADD COLUMN     "logo_url" TEXT;
