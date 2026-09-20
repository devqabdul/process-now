-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'cancelled';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "token_version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: bill_on is added nullable, backfilled from the service type, then
-- made NOT NULL, so this runs on a database that already has order items.
ALTER TABLE "order_items" ADD COLUMN     "bill_on" "BillOn";
UPDATE "order_items" oi
   SET "bill_on" = st."bill_on"
  FROM "service_types" st
 WHERE st."id" = oi."service_type_id";
ALTER TABLE "order_items" ALTER COLUMN "bill_on" SET NOT NULL;

-- AlterTable
ALTER TABLE "bills" ADD COLUMN     "amount_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "voided_at" TIMESTAMP(3),
ADD COLUMN     "void_reason" TEXT;

-- Backfill the new running total from existing payments, or every bill would look unpaid.
UPDATE "bills" b
   SET "amount_paid" = COALESCE((
         SELECT SUM(p."amount") FROM "payments" p WHERE p."bill_id" = b."id"
       ), 0);

-- CreateIndex
CREATE INDEX "orders_company_id_received_at_idx" ON "orders"("company_id", "received_at");

-- CreateIndex
CREATE INDEX "orders_company_id_vendor_id_idx" ON "orders"("company_id", "vendor_id");

-- CreateIndex
CREATE INDEX "order_items_service_type_id_idx" ON "order_items"("service_type_id");
