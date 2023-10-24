/*
  Warnings:

  - The values [DISPOSABLE] on the enum `ESubscriptionFormat` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ESubscriptionFormat_new" AS ENUM ('ANNUAL', 'MONTHLY', 'SEMI_ANNUAL');
ALTER TABLE "Subscription" ALTER COLUMN "format" DROP DEFAULT;
ALTER TABLE "Subscription" ALTER COLUMN "format" TYPE "ESubscriptionFormat_new" USING ("format"::text::"ESubscriptionFormat_new");
ALTER TYPE "ESubscriptionFormat" RENAME TO "ESubscriptionFormat_old";
ALTER TYPE "ESubscriptionFormat_new" RENAME TO "ESubscriptionFormat";
DROP TYPE "ESubscriptionFormat_old";
ALTER TABLE "Subscription" ALTER COLUMN "format" SET DEFAULT 'MONTHLY';
COMMIT;

-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "format" SET DEFAULT 'MONTHLY';
