/*
  Warnings:

  - You are about to drop the column `bookingId` on the `BookingTable` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "BookingTable" DROP CONSTRAINT "BookingTable_bookingId_fkey";

-- AlterTable
ALTER TABLE "BookingTable" DROP COLUMN "bookingId",
ADD COLUMN     "booking_id" TEXT;

-- AddForeignKey
ALTER TABLE "BookingTable" ADD CONSTRAINT "BookingTable_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
