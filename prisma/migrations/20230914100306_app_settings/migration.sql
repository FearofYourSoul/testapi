-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "client_transaction_time" INTEGER NOT NULL DEFAULT 300,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);
