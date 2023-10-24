-- CreateTable
CREATE TABLE "ClientRatingField" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,

    CONSTRAINT "ClientRatingField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientRating" (
    "id" TEXT NOT NULL,
    "rating_field_id" TEXT NOT NULL,
    "rating" INTEGER,
    "comment" TEXT,
    "booking_id" TEXT NOT NULL,

    CONSTRAINT "ClientRating_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ClientRatingField" ADD CONSTRAINT "ClientRatingField_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientRating" ADD CONSTRAINT "ClientRating_rating_field_id_fkey" FOREIGN KEY ("rating_field_id") REFERENCES "ClientRatingField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientRating" ADD CONSTRAINT "ClientRating_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
