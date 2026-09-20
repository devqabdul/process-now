-- Roles become reference data, and every business table gains audit stamps.
--
-- Hand-written rather than generated: Prisma's diff dropped and recreated
-- users.role (losing every user's role) and added updated_at as NOT NULL with
-- no default, which fails on any table that already has rows.

-- CreateTable: roles, seeded before anything references them.
CREATE TABLE "roles" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("key")
);

INSERT INTO "roles" ("key", "label", "description", "sort_order") VALUES
  ('super_admin',   'Super Admin',   'Creates and manages companies on the platform.', 1),
  ('company_admin', 'Company Admin', 'Runs one company: orders, bills, vendors and settings.', 2);

-- Convert users.role from the enum to text, keeping every existing value.
-- The check constraint was compiled against the enum type, so it has to go
-- first and come back afterwards comparing text.
ALTER TABLE "users" DROP CONSTRAINT "users_role_company_check";
ALTER TABLE "users" ALTER COLUMN "role" TYPE TEXT USING "role"::TEXT;
ALTER TABLE "users" ADD CONSTRAINT "users_role_company_check"
  CHECK (("role" = 'super_admin') = ("company_id" IS NULL));
ALTER TABLE "users" ADD CONSTRAINT "users_role_fkey"
  FOREIGN KEY ("role") REFERENCES "roles"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropEnum: nothing references it now.
DROP TYPE "Role";

-- Audit stamps. updated_at carries a default so existing rows are valid; the
-- app sets it on every write through Prisma's @updatedAt.
ALTER TABLE "companies"     ADD COLUMN "created_by" UUID, ADD COLUMN "updated_by" UUID, ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "users"         ADD COLUMN "created_by" UUID, ADD COLUMN "updated_by" UUID, ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "vendors"       ADD COLUMN "created_by" UUID, ADD COLUMN "updated_by" UUID, ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "service_types" ADD COLUMN "created_by" UUID, ADD COLUMN "updated_by" UUID, ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- These four had no created_at of their own; they were timestamped by a business
-- column (received_at, issued_at, paid_at) that means something different.
ALTER TABLE "orders"      ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD COLUMN "created_by" UUID, ADD COLUMN "updated_by" UUID, ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "order_items" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD COLUMN "created_by" UUID, ADD COLUMN "updated_by" UUID, ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "bills"       ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD COLUMN "created_by" UUID, ADD COLUMN "updated_by" UUID, ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "payments"    ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD COLUMN "created_by" UUID, ADD COLUMN "updated_by" UUID, ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "daily_logs"  ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD COLUMN "created_by" UUID, ADD COLUMN "updated_by" UUID, ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Who did it: an id, not a foreign key. Removing a user must not block the
-- delete or rewrite history, and the row should still say who made the change.
CREATE INDEX "companies_created_by_idx"     ON "companies"("created_by");
CREATE INDEX "vendors_created_by_idx"       ON "vendors"("created_by");
CREATE INDEX "service_types_created_by_idx" ON "service_types"("created_by");
CREATE INDEX "orders_created_by_idx"        ON "orders"("created_by");
CREATE INDEX "bills_created_by_idx"         ON "bills"("created_by");
CREATE INDEX "payments_created_by_idx"      ON "payments"("created_by");
