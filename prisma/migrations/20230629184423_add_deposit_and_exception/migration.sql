-- CreateEnum
CREATE TYPE "EDepositInteraction" AS ENUM ('TAKE_MORE', 'SUMMARIZE');

-- CreateTable
CREATE TABLE "Deposit" (
    "id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "person_price" INTEGER,
    "table_price" INTEGER,
    "is_table_price" BOOLEAN NOT NULL DEFAULT false,
    "is_person_price" BOOLEAN NOT NULL DEFAULT false,
    "interaction" "EDepositInteraction" NOT NULL DEFAULT 'TAKE_MORE',

    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepositException" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "person_price" INTEGER,
    "table_price" INTEGER,
    "is_table_price" BOOLEAN NOT NULL DEFAULT false,
    "is_person_price" BOOLEAN NOT NULL DEFAULT false,
    "for_days_of_week" BOOLEAN NOT NULL DEFAULT false,
    "is_all_day" BOOLEAN NOT NULL DEFAULT false,
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "days" TEXT,
    "deposit_id" TEXT NOT NULL,

    CONSTRAINT "DepositException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Deposit_place_id_key" ON "Deposit"("place_id");

-- AddForeignKey
ALTER TABLE "Deposit" ADD CONSTRAINT "Deposit_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "Place"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepositException" ADD CONSTRAINT "DepositException_deposit_id_fkey" FOREIGN KEY ("deposit_id") REFERENCES "Deposit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
