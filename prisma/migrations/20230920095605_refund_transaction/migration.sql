-- DropForeignKey
ALTER TABLE "PreOrderMenuItem" DROP CONSTRAINT "PreOrderMenuItem_place_menu_item_id_fkey";

-- CreateTable
CREATE TABLE "RefundTransaction" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "amount" INTEGER NOT NULL,
    "bepaid_uid" TEXT,
    "status" "ETransactionStatus" NOT NULL,
    "deposit_payment_id" TEXT,
    "booking_id" TEXT,
    "employee_id" TEXT,
    "owner_id" TEXT,

    CONSTRAINT "RefundTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CanceledMenuItem" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "count" INTEGER NOT NULL,
    "preorder_menu_item_id" TEXT NOT NULL,
    "refund_transaction_id" TEXT,

    CONSTRAINT "CanceledMenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefundTransaction_bepaid_uid_key" ON "RefundTransaction"("bepaid_uid");

-- AddForeignKey
ALTER TABLE "RefundTransaction" ADD CONSTRAINT "RefundTransaction_deposit_payment_id_fkey" FOREIGN KEY ("deposit_payment_id") REFERENCES "DepositPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundTransaction" ADD CONSTRAINT "RefundTransaction_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundTransaction" ADD CONSTRAINT "RefundTransaction_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundTransaction" ADD CONSTRAINT "RefundTransaction_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "Owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanceledMenuItem" ADD CONSTRAINT "CanceledMenuItem_preorder_menu_item_id_fkey" FOREIGN KEY ("preorder_menu_item_id") REFERENCES "PreOrderMenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanceledMenuItem" ADD CONSTRAINT "CanceledMenuItem_refund_transaction_id_fkey" FOREIGN KEY ("refund_transaction_id") REFERENCES "RefundTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreOrderMenuItem" ADD CONSTRAINT "PreOrderMenuItem_place_menu_item_id_fkey" FOREIGN KEY ("place_menu_item_id") REFERENCES "PlaceMenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
