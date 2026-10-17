-- AlterTable
ALTER TABLE "site_settings" ADD COLUMN "language_id" INTEGER;

-- Existing values belong to the default Bahasa Indonesia language.
UPDATE "site_settings"
SET "language_id" = (SELECT "id" FROM "languages" WHERE "abbreviated_language" = 'ID');

ALTER TABLE "site_settings" ALTER COLUMN "language_id" SET NOT NULL;

-- DropIndex
DROP INDEX "site_settings_key_key";

-- CreateIndex
CREATE UNIQUE INDEX "site_settings_key_language_id_key" ON "site_settings"("key", "language_id");

-- AddForeignKey
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
