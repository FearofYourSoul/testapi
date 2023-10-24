/*
  Warnings:

  - A unique constraint covering the columns `[organization_id,terminal_group_id]` on the table `IikoResto` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "IikoResto_organization_id_key";

-- AlterTable
ALTER TABLE "IikoResto" ADD COLUMN     "terminal_group_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "IikoResto_organization_id_terminal_group_id_key" ON "IikoResto"("organization_id", "terminal_group_id");
