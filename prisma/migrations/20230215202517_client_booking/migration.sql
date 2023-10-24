/*
  Warnings:

  - Added the required column `client_id` to the `BookingTable` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BookingTable" ADD COLUMN     "client_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "BookingTable" ADD CONSTRAINT "BookingTable_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
