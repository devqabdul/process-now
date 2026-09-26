-- Voiding a bill reopens its order for a corrected bill, so an order can hold several
-- bills, of which at most one is not voided. Prisma can't express the partial index.
DROP INDEX "bills_order_id_key";

CREATE INDEX "bills_order_id_idx" ON "bills"("order_id");

CREATE UNIQUE INDEX "bills_order_id_live_key" ON "bills"("order_id") WHERE "voided_at" IS NULL;
