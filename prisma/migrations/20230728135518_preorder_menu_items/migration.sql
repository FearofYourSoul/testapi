/*
  Warnings:

  - You are about to drop the column `pre_order_payment_id` on the `PlaceMenuItem` table. All the data in the column will be lost.
  - You are about to drop the `_BookingToPlaceMenuItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PlaceMenuItem" DROP CONSTRAINT "PlaceMenuItem_pre_order_payment_id_fkey";

-- DropForeignKey
ALTER TABLE "_BookingToPlaceMenuItem" DROP CONSTRAINT "_BookingToPlaceMenuItem_A_fkey";

-- DropForeignKey
ALTER TABLE "_BookingToPlaceMenuItem" DROP CONSTRAINT "_BookingToPlaceMenuItem_B_fkey";

-- AlterTable
ALTER TABLE "DepositPayment" RENAME CONSTRAINT "DepostitPayment_pkey" TO "DepositPayment_pkey";

-- AlterTable
ALTER TABLE "PlaceMenuItem" DROP COLUMN "pre_order_payment_id";

-- DropTable
DROP TABLE "_BookingToPlaceMenuItem";

-- CreateTable
CREATE TABLE "PreOrderMenuItem" (
    "id" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "place_menu_item_id" TEXT NOT NULL,
    "preOrderPaymentId" TEXT,
    "bookingId" TEXT,

    CONSTRAINT "PreOrderMenuItem_pkey" PRIMARY KEY ("id")
);

-- RenameForeignKey
ALTER TABLE "DepositPayment" RENAME CONSTRAINT "DepostitPayment_client_id_fkey" TO "DepositPayment_client_id_fkey";

-- AddForeignKey
ALTER TABLE "PreOrderMenuItem" ADD CONSTRAINT "PreOrderMenuItem_place_menu_item_id_fkey" FOREIGN KEY ("place_menu_item_id") REFERENCES "PlaceMenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreOrderMenuItem" ADD CONSTRAINT "PreOrderMenuItem_preOrderPaymentId_fkey" FOREIGN KEY ("preOrderPaymentId") REFERENCES "PreOrderPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreOrderMenuItem" ADD CONSTRAINT "PreOrderMenuItem_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
