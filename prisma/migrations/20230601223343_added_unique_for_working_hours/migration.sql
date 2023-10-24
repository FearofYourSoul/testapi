/*
  Warnings:

  - A unique constraint covering the columns `[day,place_id]` on the table `WorkingHours` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "WorkingHours_day_place_id_key" ON "WorkingHours"("day", "place_id");
