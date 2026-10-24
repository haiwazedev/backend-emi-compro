-- Filename is now an editable display name; the stored file is identified by path.
DROP INDEX "media_filename_key";

-- AlterTable
ALTER TABLE "media" ADD COLUMN "alt" VARCHAR(255);
