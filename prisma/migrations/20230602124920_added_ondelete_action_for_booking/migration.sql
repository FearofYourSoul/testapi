-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_place_table_id_fkey";

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_place_table_id_fkey" FOREIGN KEY ("place_table_id") REFERENCES "PlaceTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
