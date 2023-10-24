/*
  Warnings:

  - A unique constraint covering the columns `[phone_number]` on the table `Client` will be added. If there are existing duplicate values, this will fail.
  - Made the column `phone_number` on table `Client` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "ERestoTableShape" AS ENUM ('RECTANGLE', 'CIRCLE');

-- CreateEnum
CREATE TYPE "ERestoExpensiveness" AS ENUM ('CHEAP', 'MEDIUM', 'EXPENSIVE');

-- DropIndex
DROP INDEX "Client_email_key";

-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "restoId" TEXT;

-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "first_name" DROP NOT NULL,
ALTER COLUMN "last_name" DROP NOT NULL,
ALTER COLUMN "phone_number" SET NOT NULL;

-- CreateTable
CREATE TABLE "Resto" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "logo_url" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "iiko_resto_id" TEXT,
    "expensiveness" "ERestoExpensiveness" NOT NULL,

    CONSTRAINT "Resto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "url" TEXT NOT NULL,
    "restoId" TEXT,
    "restoTableId" TEXT,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestoSection" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "external_id" TEXT,
    "resto_id" TEXT NOT NULL,

    CONSTRAINT "RestoSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestoTable" (
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
    "shape" "ERestoTableShape" NOT NULL DEFAULT 'RECTANGLE',
    "resto_section_id" TEXT NOT NULL,

    CONSTRAINT "RestoTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryResto" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "restoId" TEXT NOT NULL,
    "categoryId" TEXT,

    CONSTRAINT "CategoryResto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "name" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingTable" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "bookingId" TEXT,
    "restoTableId" TEXT,

    CONSTRAINT "BookingTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "number_persons" INTEGER NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Resto_iiko_resto_id_key" ON "Resto"("iiko_resto_id");

-- CreateIndex
CREATE UNIQUE INDEX "Client_phone_number_key" ON "Client"("phone_number");

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_restoId_fkey" FOREIGN KEY ("restoId") REFERENCES "Resto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resto" ADD CONSTRAINT "Resto_iiko_resto_id_fkey" FOREIGN KEY ("iiko_resto_id") REFERENCES "IikoResto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_restoId_fkey" FOREIGN KEY ("restoId") REFERENCES "Resto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_restoTableId_fkey" FOREIGN KEY ("restoTableId") REFERENCES "RestoTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestoSection" ADD CONSTRAINT "RestoSection_resto_id_fkey" FOREIGN KEY ("resto_id") REFERENCES "Resto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestoTable" ADD CONSTRAINT "RestoTable_resto_section_id_fkey" FOREIGN KEY ("resto_section_id") REFERENCES "RestoSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryResto" ADD CONSTRAINT "CategoryResto_restoId_fkey" FOREIGN KEY ("restoId") REFERENCES "Resto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryResto" ADD CONSTRAINT "CategoryResto_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingTable" ADD CONSTRAINT "BookingTable_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingTable" ADD CONSTRAINT "BookingTable_restoTableId_fkey" FOREIGN KEY ("restoTableId") REFERENCES "RestoTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
