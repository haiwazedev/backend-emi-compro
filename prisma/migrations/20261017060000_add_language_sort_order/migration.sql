-- AlterTable
ALTER TABLE "languages" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 1;

-- Bahasa Indonesia keeps the default 1; English follows.
UPDATE "languages" SET "sort_order" = 2 WHERE "id" = 'en';
