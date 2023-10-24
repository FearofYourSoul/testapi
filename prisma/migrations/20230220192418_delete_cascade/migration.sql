-- DropForeignKey
ALTER TABLE "CategoryPlace" DROP CONSTRAINT "CategoryPlace_place_id_fkey";

-- DropForeignKey
ALTER TABLE "Image" DROP CONSTRAINT "Image_place_id_fkey";

-- DropForeignKey
ALTER TABLE "Image" DROP CONSTRAINT "Image_place_table_id_fkey";

-- DropForeignKey
ALTER TABLE "PlaceKitchen" DROP CONSTRAINT "PlaceKitchen_place_id_fkey";

-- DropForeignKey
ALTER TABLE "PlacePayment" DROP CONSTRAINT "PlacePayment_place_id_fkey";

-- DropForeignKey
ALTER TABLE "PlaceSection" DROP CONSTRAINT "PlaceSection_place_id_fkey";

-- DropForeignKey
ALTER TABLE "PlaceTable" DROP CONSTRAINT "PlaceTable_place_section_id_fkey";

-- DropForeignKey
ALTER TABLE "WorkingHours" DROP CONSTRAINT "WorkingHours_place_id_fkey";

-- AlterTable
ALTER TABLE "PlacePayment" ALTER COLUMN "place_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_place_table_id_fkey" FOREIGN KEY ("place_table_id") REFERENCES "PlaceTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceSection" ADD CONSTRAINT "PlaceSection_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceTable" ADD CONSTRAINT "PlaceTable_place_section_id_fkey" FOREIGN KEY ("place_section_id") REFERENCES "PlaceSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryPlace" ADD CONSTRAINT "CategoryPlace_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceKitchen" ADD CONSTRAINT "PlaceKitchen_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkingHours" ADD CONSTRAINT "WorkingHours_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacePayment" ADD CONSTRAINT "PlacePayment_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;
