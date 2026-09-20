-- A colour per role, so the app can mark which workspace you are in at a glance.
-- Stored as a design-token name rather than a hex: the UI owns the palette, and
-- a token keeps light and dark themes consistent.
ALTER TABLE "roles" ADD COLUMN "accent" TEXT NOT NULL DEFAULT 'brand';

UPDATE "roles" SET "accent" = 'brand'   WHERE "key" = 'super_admin';
UPDATE "roles" SET "accent" = 'warning' WHERE "key" = 'company_admin';
