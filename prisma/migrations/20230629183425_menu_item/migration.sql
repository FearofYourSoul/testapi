-- CreateTable
CREATE TABLE "PlaceMenuCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,

    CONSTRAINT "PlaceMenuCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaceMenuItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "weight" INTEGER NOT NULL,
    "calories" DOUBLE PRECISION,
    "place_menu_category_id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "image_id" TEXT,

    CONSTRAINT "PlaceMenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlaceMenuItem_image_id_key" ON "PlaceMenuItem"("image_id");

-- AddForeignKey
ALTER TABLE "PlaceMenuCategory" ADD CONSTRAINT "PlaceMenuCategory_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "Place"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceMenuItem" ADD CONSTRAINT "PlaceMenuItem_place_menu_category_id_fkey" FOREIGN KEY ("place_menu_category_id") REFERENCES "PlaceMenuCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceMenuItem" ADD CONSTRAINT "PlaceMenuItem_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "Place"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceMenuItem" ADD CONSTRAINT "PlaceMenuItem_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;
