/*
  Warnings:

  - A unique constraint covering the columns `[expo_token]` on the table `Client` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "expo_token" TEXT,
ADD COLUMN     "expo_token_updated_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Client_expo_token_key" ON "Client"("expo_token");
