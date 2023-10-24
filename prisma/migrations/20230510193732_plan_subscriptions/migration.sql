/*
  Warnings:

  - A unique constraint covering the columns `[place_subscription_id]` on the table `Place` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `place_subscription_id` to the `Place` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ESubscriptionPlan" AS ENUM ('FREE', 'PLUS', 'PRO');

-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "place_subscription_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "PlaceSubscription" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "status" "ESubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "subscription_plan_id" TEXT NOT NULL,
    "place_id" TEXT,
    "subscriptionDiscountId" TEXT,

    CONSTRAINT "PlaceSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionDiscount" (
    "id" TEXT NOT NULL,
    "discount" INTEGER NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "label" TEXT,
    "promotion_code" TEXT,
    "amount" INTEGER,

    CONSTRAINT "SubscriptionDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "name" "ESubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "price" INTEGER NOT NULL DEFAULT 0,
    "format" "ESubscriptionFormat" NOT NULL DEFAULT 'MONTHLY',
    "month_count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionOption" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "SubscriptionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SubscriptionOptionToSubscriptionPlan" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_SubscriptionOptionToSubscriptionPlan_AB_unique" ON "_SubscriptionOptionToSubscriptionPlan"("A", "B");

-- CreateIndex
CREATE INDEX "_SubscriptionOptionToSubscriptionPlan_B_index" ON "_SubscriptionOptionToSubscriptionPlan"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Place_place_subscription_id_key" ON "Place"("place_subscription_id");

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_place_subscription_id_fkey" FOREIGN KEY ("place_subscription_id") REFERENCES "PlaceSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceSubscription" ADD CONSTRAINT "PlaceSubscription_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceSubscription" ADD CONSTRAINT "PlaceSubscription_subscriptionDiscountId_fkey" FOREIGN KEY ("subscriptionDiscountId") REFERENCES "SubscriptionDiscount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubscriptionOptionToSubscriptionPlan" ADD CONSTRAINT "_SubscriptionOptionToSubscriptionPlan_A_fkey" FOREIGN KEY ("A") REFERENCES "SubscriptionOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubscriptionOptionToSubscriptionPlan" ADD CONSTRAINT "_SubscriptionOptionToSubscriptionPlan_B_fkey" FOREIGN KEY ("B") REFERENCES "SubscriptionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
