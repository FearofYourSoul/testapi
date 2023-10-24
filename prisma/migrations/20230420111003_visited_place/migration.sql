-- CreateTable
CREATE TABLE "VisitedPlace" (
    "last_visit" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "place_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "VisitedPlace_place_id_client_id_key" ON "VisitedPlace"("place_id", "client_id");

-- AddForeignKey
ALTER TABLE "VisitedPlace" ADD CONSTRAINT "VisitedPlace_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitedPlace" ADD CONSTRAINT "VisitedPlace_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
