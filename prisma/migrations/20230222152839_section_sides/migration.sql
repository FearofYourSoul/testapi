/*
  Warnings:

  - You are about to alter the column `width` on the `PlaceSection` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Integer`.
  - You are about to alter the column `height` on the `PlaceSection` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Integer`.

*/
-- AlterTable
ALTER TABLE "PlaceSection" ALTER COLUMN "width" SET DATA TYPE INTEGER,
ALTER COLUMN "height" SET DATA TYPE INTEGER;
