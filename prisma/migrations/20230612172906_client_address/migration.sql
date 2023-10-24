/*
  Warnings:

  - You are about to drop the column `place_id` on the `Address` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[current_location_id]` on the table `Client` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[address_id]` on the table `Place` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Address" DROP CONSTRAINT "Address_place_id_fkey";

-- AlterTable
ALTER TABLE "Address" DROP COLUMN "place_id",
ADD COLUMN     "country_code" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ALTER COLUMN "postal_code" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "current_location_id" TEXT;

-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "address_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Client_current_location_id_key" ON "Client"("current_location_id");

-- CreateIndex
CREATE UNIQUE INDEX "Place_address_id_key" ON "Place"("address_id");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_current_location_id_fkey" FOREIGN KEY ("current_location_id") REFERENCES "Address"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "Address"("id") ON DELETE CASCADE ON UPDATE CASCADE;
