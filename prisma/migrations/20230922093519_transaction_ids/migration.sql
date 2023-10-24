/*
  Warnings:

  - A unique constraint covering the columns `[bepaid_cancel_id]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[bepaid_captures_id]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "bepaid_cancel_id" TEXT,
ADD COLUMN     "bepaid_captures_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_bepaid_cancel_id_key" ON "Payment"("bepaid_cancel_id");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_bepaid_captures_id_key" ON "Payment"("bepaid_captures_id");
