-- One spelling for "is this still in use" across the four tables that have things
-- you retire rather than delete. Transactional tables (orders, bills, payments,
-- daily_logs) keep their own lifecycle columns instead.

ALTER TABLE "companies" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users"     ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "vendors"   ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

-- Renamed, not dropped and recreated: a generated DROP/ADD would forget which
-- service types had already been retired.
ALTER TABLE "service_types" RENAME COLUMN "active" TO "is_active";
