-- Language-related data is discarded (approved) and re-seeded with code ids.
DELETE FROM "article_contents";
DELETE FROM "articles";
DELETE FROM "site_settings";
DELETE FROM "languages";

-- DropForeignKey
ALTER TABLE "article_contents" DROP CONSTRAINT "article_contents_language_id_fkey";
ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_language_id_fkey";

-- DropIndex
DROP INDEX "languages_abbreviated_language_key";

-- AlterTable
ALTER TABLE "languages" DROP COLUMN "abbreviated_language",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(10);
DROP SEQUENCE "languages_id_seq";

ALTER TABLE "article_contents" ALTER COLUMN "language_id" SET DATA TYPE VARCHAR(10);
ALTER TABLE "site_settings" ALTER COLUMN "language_id" SET DATA TYPE VARCHAR(10);

-- AddForeignKey
ALTER TABLE "article_contents" ADD CONSTRAINT "article_contents_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
