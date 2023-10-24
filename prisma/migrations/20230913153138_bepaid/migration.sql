/*
  Warnings:

  - A unique constraint covering the columns `[payment_id]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ETransactionStatus" AS ENUM ('successful', 'failed', 'incomplete', 'expired', 'pending_payment', 'canceled');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "payment_id" TEXT,
ADD COLUMN     "payment_status" "ETransactionStatus";

-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "bepaid_id" TEXT,
ADD COLUMN     "bepaid_secret_key" TEXT;

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "amount" INTEGER NOT NULL,
    "status" "ETransactionStatus" NOT NULL,
    "checkout_token" TEXT NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_payment_id_key" ON "Booking"("payment_id");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
