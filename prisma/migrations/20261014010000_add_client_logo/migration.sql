-- Logos are now uploaded directly instead of picked from the media library.
-- Existing clients have no logo file, so they are removed; re-run the seed.
DELETE FROM "clients";

-- DropForeignKey
ALTER TABLE "clients" DROP CONSTRAINT "clients_media_id_fkey";

-- AlterTable
ALTER TABLE "clients" DROP COLUMN "media_id",
ADD COLUMN     "logo_filename" VARCHAR(500) NOT NULL,
ADD COLUMN     "logo_filepath" VARCHAR(500) NOT NULL,
ADD COLUMN     "logo_extension" VARCHAR(10) NOT NULL,
ADD COLUMN     "logo_size" INTEGER NOT NULL,
ADD COLUMN     "logo_metadata" JSONB NOT NULL;
