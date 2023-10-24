/*
  Warnings:

  - A unique constraint covering the columns `[deposit_payment_id]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[pre_order_payment_id]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "deposit_payment_id" TEXT,
ADD COLUMN     "pre_order_payment_id" TEXT;

-- AlterTable
ALTER TABLE "PlaceMenuItem" ADD COLUMN     "pre_order_payment_id" TEXT;

-- CreateTable
CREATE TABLE "DepositPayment" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "fee" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "client_id" TEXT NOT NULL,

    CONSTRAINT "DepostitPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreOrderPayment" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "fee" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "client_id" TEXT NOT NULL,

    CONSTRAINT "PreOrderPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_BookingToPlaceMenuItem" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_BookingToPlaceMenuItem_AB_unique" ON "_BookingToPlaceMenuItem"("A", "B");

-- CreateIndex
CREATE INDEX "_BookingToPlaceMenuItem_B_index" ON "_BookingToPlaceMenuItem"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_deposit_payment_id_key" ON "Booking"("deposit_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_pre_order_payment_id_key" ON "Booking"("pre_order_payment_id");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_deposit_payment_id_fkey" FOREIGN KEY ("deposit_payment_id") REFERENCES "DepositPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_pre_order_payment_id_fkey" FOREIGN KEY ("pre_order_payment_id") REFERENCES "PreOrderPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepositPayment" ADD CONSTRAINT "DepostitPayment_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreOrderPayment" ADD CONSTRAINT "PreOrderPayment_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceMenuItem" ADD CONSTRAINT "PlaceMenuItem_pre_order_payment_id_fkey" FOREIGN KEY ("pre_order_payment_id") REFERENCES "PreOrderPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BookingToPlaceMenuItem" ADD CONSTRAINT "_BookingToPlaceMenuItem_A_fkey" FOREIGN KEY ("A") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BookingToPlaceMenuItem" ADD CONSTRAINT "_BookingToPlaceMenuItem_B_fkey" FOREIGN KEY ("B") REFERENCES "PlaceMenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
