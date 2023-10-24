/*
  Warnings:

  - Added the required column `booking_number` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "booking_number" INTEGER NOT NULL;
