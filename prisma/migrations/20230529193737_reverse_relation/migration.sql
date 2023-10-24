/*
  Warnings:

  - You are about to drop the column `base_image_id` on the `Place` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[base_place_id]` on the table `Image` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Place" DROP CONSTRAINT "Place_base_image_id_fkey";

-- DropIndex
DROP INDEX "Place_base_image_id_key";

-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "base_place_id" TEXT;

-- AlterTable
ALTER TABLE "Place" DROP COLUMN "base_image_id";

-- CreateIndex
CREATE UNIQUE INDEX "Image_base_place_id_key" ON "Image"("base_place_id");

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_base_place_id_fkey" FOREIGN KEY ("base_place_id") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
