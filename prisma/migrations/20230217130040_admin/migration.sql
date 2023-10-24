/*
  Warnings:

  - You are about to drop the column `iiko_resto_id` on the `Address` table. All the data in the column will be lost.
  - You are about to drop the column `restoId` on the `Address` table. All the data in the column will be lost.
  - You are about to drop the column `restoTableId` on the `BookingTable` table. All the data in the column will be lost.
  - You are about to drop the column `restoId` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `restoTableId` on the `Image` table. All the data in the column will be lost.
  - You are about to drop the column `isDayOff` on the `WorkingHours` table. All the data in the column will be lost.
  - You are about to drop the column `isWorkingAllDay` on the `WorkingHours` table. All the data in the column will be lost.
  - You are about to drop the column `restoId` on the `WorkingHours` table. All the data in the column will be lost.
  - You are about to drop the `CategoryResto` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `IikoResto` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Resto` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RestoSection` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RestoTable` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `place_id` to the `WorkingHours` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EPlaceTableShape" AS ENUM ('RECTANGLE', 'CIRCLE');

-- CreateEnum
CREATE TYPE "EPlaceExpensiveness" AS ENUM ('CHEAP', 'MEDIUM', 'EXPENSIVE');

-- CreateEnum
CREATE TYPE "ESubscriptionStatus" AS ENUM ('ACTIVE', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ESubscriptionFormat" AS ENUM ('DISPOSABLE', 'MONTHLY', 'ANNUAL');

-- DropForeignKey
ALTER TABLE "Address" DROP CONSTRAINT "Address_iiko_resto_id_fkey";

-- DropForeignKey
ALTER TABLE "Address" DROP CONSTRAINT "Address_restoId_fkey";

-- DropForeignKey
ALTER TABLE "BookingTable" DROP CONSTRAINT "BookingTable_restoTableId_fkey";

-- DropForeignKey
ALTER TABLE "CategoryResto" DROP CONSTRAINT "CategoryResto_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "CategoryResto" DROP CONSTRAINT "CategoryResto_restoId_fkey";

-- DropForeignKey
ALTER TABLE "Image" DROP CONSTRAINT "Image_restoId_fkey";

-- DropForeignKey
ALTER TABLE "Image" DROP CONSTRAINT "Image_restoTableId_fkey";

-- DropForeignKey
ALTER TABLE "Resto" DROP CONSTRAINT "Resto_iiko_resto_id_fkey";

-- DropForeignKey
ALTER TABLE "RestoSection" DROP CONSTRAINT "RestoSection_resto_id_fkey";

-- DropForeignKey
ALTER TABLE "RestoTable" DROP CONSTRAINT "RestoTable_resto_section_id_fkey";

-- DropForeignKey
ALTER TABLE "WorkingHours" DROP CONSTRAINT "WorkingHours_restoId_fkey";

-- AlterTable
ALTER TABLE "Address" DROP COLUMN "iiko_resto_id",
DROP COLUMN "restoId",
ADD COLUMN     "iiko_Place_id" TEXT,
ADD COLUMN     "place_id" TEXT;

-- AlterTable
ALTER TABLE "BookingTable" DROP COLUMN "restoTableId",
ADD COLUMN     "place_table_id" TEXT;

-- AlterTable
ALTER TABLE "Image" DROP COLUMN "restoId",
DROP COLUMN "restoTableId",
ADD COLUMN     "is_default" BOOLEAN,
ADD COLUMN     "place_id" TEXT,
ADD COLUMN     "place_table_id" TEXT;

-- AlterTable
ALTER TABLE "WorkingHours" DROP COLUMN "isDayOff",
DROP COLUMN "isWorkingAllDay",
DROP COLUMN "restoId",
ADD COLUMN     "is_day_off" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_working_all_day" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "place_id" TEXT NOT NULL;

-- DropTable
DROP TABLE "CategoryResto";

-- DropTable
DROP TABLE "IikoResto";

-- DropTable
DROP TABLE "Resto";

-- DropTable
DROP TABLE "RestoSection";

-- DropTable
DROP TABLE "RestoTable";

-- DropEnum
DROP TYPE "ERestoExpensiveness";

-- DropEnum
DROP TYPE "ERestoTableShape";

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "refresh_token" TEXT,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "logo_url" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "iiko_Place_id" TEXT,
    "expensiveness" "EPlaceExpensiveness" NOT NULL,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaceSection" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "width" DECIMAL(65,30) NOT NULL,
    "height" DECIMAL(65,30) NOT NULL,
    "external_id" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "place_id" TEXT NOT NULL,

    CONSTRAINT "PlaceSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaceTable" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "external_id" TEXT NOT NULL,
    "x" DECIMAL(65,30) NOT NULL,
    "y" DECIMAL(65,30) NOT NULL,
    "angle" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "width" DECIMAL(65,30) NOT NULL,
    "height" DECIMAL(65,30) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "iiko_table_name" TEXT,
    "shape" "EPlaceTableShape" NOT NULL DEFAULT 'RECTANGLE',
    "place_section_id" TEXT NOT NULL,

    CONSTRAINT "PlaceTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryPlace" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "place_id" TEXT NOT NULL,
    "category_id" TEXT,

    CONSTRAINT "CategoryPlace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaceKitchen" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "place_id" TEXT,
    "kitchen_id" TEXT,

    CONSTRAINT "PlaceKitchen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kitchen" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "name" TEXT NOT NULL,

    CONSTRAINT "Kitchen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IikoPlace" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "address_id" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "organization_id" TEXT,
    "terminal_group_id" TEXT,
    "api_login" TEXT,

    CONSTRAINT "IikoPlace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "end_time" TIMESTAMP(3) NOT NULL,
    "withdraw_time" TIMESTAMP(3),
    "status" "ESubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "format" "ESubscriptionFormat" NOT NULL DEFAULT 'DISPOSABLE',

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacePayment" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "amount" DECIMAL(65,30) NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,

    CONSTRAINT "PlacePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Place_iiko_Place_id_key" ON "Place"("iiko_Place_id");

-- CreateIndex
CREATE UNIQUE INDEX "IikoPlace_organization_id_terminal_group_id_key" ON "IikoPlace"("organization_id", "terminal_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "PlacePayment_subscription_id_key" ON "PlacePayment"("subscription_id");

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_iiko_Place_id_fkey" FOREIGN KEY ("iiko_Place_id") REFERENCES "IikoPlace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_iiko_Place_id_fkey" FOREIGN KEY ("iiko_Place_id") REFERENCES "IikoPlace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_place_table_id_fkey" FOREIGN KEY ("place_table_id") REFERENCES "PlaceTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceSection" ADD CONSTRAINT "PlaceSection_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "Place"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceTable" ADD CONSTRAINT "PlaceTable_place_section_id_fkey" FOREIGN KEY ("place_section_id") REFERENCES "PlaceSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryPlace" ADD CONSTRAINT "CategoryPlace_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "Place"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryPlace" ADD CONSTRAINT "CategoryPlace_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceKitchen" ADD CONSTRAINT "PlaceKitchen_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceKitchen" ADD CONSTRAINT "PlaceKitchen_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "Kitchen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingTable" ADD CONSTRAINT "BookingTable_place_table_id_fkey" FOREIGN KEY ("place_table_id") REFERENCES "PlaceTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkingHours" ADD CONSTRAINT "WorkingHours_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "Place"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacePayment" ADD CONSTRAINT "PlacePayment_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacePayment" ADD CONSTRAINT "PlacePayment_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "Place"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
