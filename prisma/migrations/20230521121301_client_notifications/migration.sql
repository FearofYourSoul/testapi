/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `Client` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "has_email_notifications" BOOLEAN,
ADD COLUMN     "is_email_verified" BOOLEAN,
ADD COLUMN     "push_notifications" BOOLEAN;

-- CreateIndex
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");
