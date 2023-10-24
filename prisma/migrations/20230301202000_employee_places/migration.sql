/*
  Warnings:

  - You are about to drop the column `employee_id` on the `Place` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Place" DROP CONSTRAINT "Place_employee_id_fkey";

-- AlterTable
ALTER TABLE "Place" DROP COLUMN "employee_id";

-- CreateTable
CREATE TABLE "EmployeePlace" (
    "place_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,

    CONSTRAINT "EmployeePlace_pkey" PRIMARY KEY ("place_id","employee_id")
);

-- AddForeignKey
ALTER TABLE "EmployeePlace" ADD CONSTRAINT "EmployeePlace_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePlace" ADD CONSTRAINT "EmployeePlace_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
