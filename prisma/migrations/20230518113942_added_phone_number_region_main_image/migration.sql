/*
  Warnings:

  - You are about to drop the column `logo_url` on the `Place` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "region" TEXT;

-- AlterTable
ALTER TABLE "Place" DROP COLUMN "logo_url",
ADD COLUMN     "main_image" TEXT,
ADD COLUMN     "phone_number" TEXT;
