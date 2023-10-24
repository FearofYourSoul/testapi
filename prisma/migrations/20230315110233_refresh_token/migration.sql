/*
  Warnings:

  - A unique constraint covering the columns `[user_agent,ip,owner_id]` on the table `RefreshToken` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_agent,ip,employee_id]` on the table `RefreshToken` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "RefreshToken_user_agent_ip_owner_id_employee_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_user_agent_ip_owner_id_key" ON "RefreshToken"("user_agent", "ip", "owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_user_agent_ip_employee_id_key" ON "RefreshToken"("user_agent", "ip", "employee_id");
