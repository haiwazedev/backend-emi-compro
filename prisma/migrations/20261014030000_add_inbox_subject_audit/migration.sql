-- AlterTable
ALTER TABLE "inbox_subjects" ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "created_by" VARCHAR(100) NOT NULL DEFAULT 'system',
ADD COLUMN     "updated_at" TIMESTAMPTZ(6),
ADD COLUMN     "updated_by" VARCHAR(100);

-- Existing seeded rows are backfilled as 'system'; new rows must set created_by.
ALTER TABLE "inbox_subjects" ALTER COLUMN "created_by" DROP DEFAULT;
