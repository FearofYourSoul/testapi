/*
  Warnings:

  - You are about to drop the `PlacePayment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Subscription` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PlacePayment" DROP CONSTRAINT "PlacePayment_place_id_fkey";

-- DropForeignKey
ALTER TABLE "PlacePayment" DROP CONSTRAINT "PlacePayment_subscription_id_fkey";

-- DropTable
DROP TABLE "PlacePayment";

-- DropTable
DROP TABLE "Subscription";
