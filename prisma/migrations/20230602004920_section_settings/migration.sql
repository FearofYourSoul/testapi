-- AlterTable
ALTER TABLE "PlaceSection" ADD COLUMN     "is_summer_terrace" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_visible" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "width" SET DEFAULT 0,
ALTER COLUMN "height" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "WorkingHours" ADD COLUMN     "place_section_id" TEXT,
ALTER COLUMN "place_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "WorkingHours" ADD CONSTRAINT "WorkingHours_place_section_id_fkey" FOREIGN KEY ("place_section_id") REFERENCES "PlaceSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
