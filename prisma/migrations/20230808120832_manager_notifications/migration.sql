-- CreateTable
CREATE TABLE "ManagerNotification" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "booking_notification_id" TEXT,
    "owner_id" TEXT,
    "employee_id" TEXT,
    "client_id" TEXT,

    CONSTRAINT "ManagerNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingNotification" (
    "id" TEXT NOT NULL,
    "booking_status" "EBookingStatus",
    "booking_id" TEXT,
    "place_id" TEXT,

    CONSTRAINT "BookingNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagerNotificationViewedBy" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT,
    "employee_id" TEXT,
    "manager_notification_id" TEXT NOT NULL,

    CONSTRAINT "ManagerNotificationViewedBy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ManagerNotification_booking_notification_id_key" ON "ManagerNotification"("booking_notification_id");

-- AddForeignKey
ALTER TABLE "ManagerNotification" ADD CONSTRAINT "ManagerNotification_booking_notification_id_fkey" FOREIGN KEY ("booking_notification_id") REFERENCES "BookingNotification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerNotification" ADD CONSTRAINT "ManagerNotification_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "Owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerNotification" ADD CONSTRAINT "ManagerNotification_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerNotification" ADD CONSTRAINT "ManagerNotification_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingNotification" ADD CONSTRAINT "BookingNotification_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingNotification" ADD CONSTRAINT "BookingNotification_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerNotificationViewedBy" ADD CONSTRAINT "ManagerNotificationViewedBy_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "Owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerNotificationViewedBy" ADD CONSTRAINT "ManagerNotificationViewedBy_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerNotificationViewedBy" ADD CONSTRAINT "ManagerNotificationViewedBy_manager_notification_id_fkey" FOREIGN KEY ("manager_notification_id") REFERENCES "ManagerNotification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
