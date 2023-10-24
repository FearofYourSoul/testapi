/*
  Warnings:

  - A unique constraint covering the columns `[bepaid_uid]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `currency` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ECurrencies" AS ENUM ('BYN', 'CNY', 'EUR', 'PLN', 'RUB', 'UAH', 'USD');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "bepaid_uid" TEXT,
ADD COLUMN     "canceled_at" TIMESTAMP(3),
ADD COLUMN     "currency" "ECurrencies" NOT NULL,
ADD COLUMN     "debited_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_bepaid_uid_key" ON "Payment"("bepaid_uid");
