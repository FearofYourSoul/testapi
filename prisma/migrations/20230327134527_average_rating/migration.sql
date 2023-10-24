-- CreateTable
CREATE TABLE "AverageClientRating" (
    "id" TEXT NOT NULL,
    "rating_name" TEXT NOT NULL,
    "average_rating" DOUBLE PRECISION NOT NULL,
    "success_bookings" INTEGER NOT NULL DEFAULT 0,
    "rating_field_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,

    CONSTRAINT "AverageClientRating_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AverageClientRating" ADD CONSTRAINT "AverageClientRating_rating_field_id_fkey" FOREIGN KEY ("rating_field_id") REFERENCES "ClientRatingField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AverageClientRating" ADD CONSTRAINT "AverageClientRating_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
