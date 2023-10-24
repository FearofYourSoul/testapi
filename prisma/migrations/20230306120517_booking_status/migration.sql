/*
  Warnings:

  - You are about to drop the `BookingTable` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `client_id` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `place_table_id` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EBookingStatus" AS ENUM ('ACCEPTED', 'REJECTED', 'WAITING');

-- DropForeignKey
ALTER TABLE "BookingTable" DROP CONSTRAINT "BookingTable_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "BookingTable" DROP CONSTRAINT "BookingTable_client_id_fkey";

-- DropForeignKey
ALTER TABLE "BookingTable" DROP CONSTRAINT "BookingTable_place_table_id_fkey";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "client_id" TEXT NOT NULL,
ADD COLUMN     "comment" TEXT,
ADD COLUMN     "place_table_id" TEXT NOT NULL,
ADD COLUMN     "status" "EBookingStatus" NOT NULL DEFAULT 'WAITING';

-- DropTable
DROP TABLE "BookingTable";

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_place_table_id_fkey" FOREIGN KEY ("place_table_id") REFERENCES "PlaceTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
