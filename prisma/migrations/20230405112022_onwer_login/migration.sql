/*
  Warnings:

  - A unique constraint covering the columns `[login]` on the table `Owner` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Owner" ADD COLUMN     "login" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Owner_login_key" ON "Owner"("login");
