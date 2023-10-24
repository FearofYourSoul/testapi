-- CreateTable
CREATE TABLE "FavoritePlace" (
    "place_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "FavoritePlace_place_id_client_id_key" ON "FavoritePlace"("place_id", "client_id");

-- AddForeignKey
ALTER TABLE "FavoritePlace" ADD CONSTRAINT "FavoritePlace_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoritePlace" ADD CONSTRAINT "FavoritePlace_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
