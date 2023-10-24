/*
  Warnings:

  - A unique constraint covering the columns `[reserves_settings_id]` on the table `Place` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `reserves_settings_id` to the `Place` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "reserves_settings_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "ReservesSettings" (
    "id" TEXT NOT NULL,
    "response_time" INTEGER NOT NULL DEFAULT 300,
    "unreachable_interval" INTEGER NOT NULL DEFAULT 900,
    "delayed_response_time" INTEGER NOT NULL DEFAULT 3600,
    "time_between_reserves" INTEGER NOT NULL DEFAULT 0,
    "min_booking_time" INTEGER NOT NULL DEFAULT 1800,
    "max_booking_time" INTEGER NOT NULL DEFAULT 10800,

    CONSTRAINT "ReservesSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Place_reserves_settings_id_key" ON "Place"("reserves_settings_id");

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_reserves_settings_id_fkey" FOREIGN KEY ("reserves_settings_id") REFERENCES "ReservesSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
