-- site_contents / site_content_items fully replace contents; existing rows are not migrated.
-- DropForeignKey
ALTER TABLE "contents" DROP CONSTRAINT "contents_media_id_fkey";

-- DropTable
DROP TABLE "contents";
