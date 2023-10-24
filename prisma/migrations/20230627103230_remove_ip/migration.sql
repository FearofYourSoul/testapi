/*
  Warnings:

  - You are about to drop the column `ip` on the `RefreshToken` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_agent,owner_id]` on the table `RefreshToken` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_agent,employee_id]` on the table `RefreshToken` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "RefreshToken_user_agent_ip_employee_id_key";

-- DropIndex
DROP INDEX "RefreshToken_user_agent_ip_owner_id_key";

-- AlterTable
ALTER TABLE "RefreshToken" DROP COLUMN "ip";

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_user_agent_owner_id_key" ON "RefreshToken"("user_agent", "owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_user_agent_employee_id_key" ON "RefreshToken"("user_agent", "employee_id");
