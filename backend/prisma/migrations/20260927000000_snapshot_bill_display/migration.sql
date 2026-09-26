-- Bills are snapshots: what an invoice prints must not change when the company or a
-- service type is edited later. Existing rows take today's values, the best record left.
ALTER TABLE "orders" ADD COLUMN "number_prefix" TEXT;
ALTER TABLE "bills" ADD COLUMN "number_prefix" TEXT,
  ADD COLUMN "company_name" TEXT,
  ADD COLUMN "gst_no" TEXT;
ALTER TABLE "order_items" ADD COLUMN "service_name" TEXT,
  ADD COLUMN "unit" TEXT;

UPDATE "orders" o SET "number_prefix" = c."number_prefix"
  FROM "companies" c WHERE c."id" = o."company_id";
-- A bill raised without GST keeps no GSTIN, even if the company registered since.
UPDATE "bills" b SET "number_prefix" = c."number_prefix",
  "company_name" = c."name",
  "gst_no" = CASE WHEN b."gst_amount" IS NOT NULL THEN c."gst_no" END
  FROM "companies" c WHERE c."id" = b."company_id";
UPDATE "order_items" i SET "service_name" = s."name", "unit" = s."unit"
  FROM "service_types" s WHERE s."id" = i."service_type_id";

ALTER TABLE "bills" ALTER COLUMN "company_name" SET NOT NULL;
ALTER TABLE "order_items" ALTER COLUMN "service_name" SET NOT NULL,
  ALTER COLUMN "unit" SET NOT NULL;
