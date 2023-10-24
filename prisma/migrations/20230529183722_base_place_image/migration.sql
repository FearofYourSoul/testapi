/*
  Warnings:

  - You are about to drop the column `is_default` on the `Image` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[base_image_id]` on the table `Place` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Image" DROP COLUMN "is_default";

-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "base_image_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Place_base_image_id_key" ON "Place"("base_image_id");

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_base_image_id_fkey" FOREIGN KEY ("base_image_id") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;
