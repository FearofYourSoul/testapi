-- CreateEnum
CREATE TYPE "EPlaceDecorType" AS ENUM ('RECTANGLE');

-- CreateTable
CREATE TABLE "PlaceDecor" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "type" "EPlaceDecorType" NOT NULL,
    "x" DECIMAL(65,30) NOT NULL,
    "y" DECIMAL(65,30) NOT NULL,
    "angle" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "width" DECIMAL(65,30) NOT NULL,
    "height" DECIMAL(65,30) NOT NULL,
    "place_section_id" TEXT NOT NULL,

    CONSTRAINT "PlaceDecor_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PlaceDecor" ADD CONSTRAINT "PlaceDecor_place_section_id_fkey" FOREIGN KEY ("place_section_id") REFERENCES "PlaceSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
