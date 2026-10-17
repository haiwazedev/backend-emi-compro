-- AlterTable: existing rows get 1 minute; the service sets the real value on every save.
ALTER TABLE "article_contents" ADD COLUMN "read_time" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "article_contents" ALTER COLUMN "read_time" DROP DEFAULT;
