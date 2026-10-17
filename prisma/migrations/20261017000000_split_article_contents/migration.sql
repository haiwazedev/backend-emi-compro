-- Existing articles are discarded (approved): their content has no language to move into.
DELETE FROM "articles";

-- DropIndex
DROP INDEX "articles_slug_key";

-- AlterTable
ALTER TABLE "articles" DROP COLUMN "content",
DROP COLUMN "slug",
DROP COLUMN "status",
DROP COLUMN "summary",
DROP COLUMN "title";

-- CreateTable
CREATE TABLE "languages" (
    "id" SERIAL NOT NULL,
    "language" VARCHAR(255) NOT NULL,
    "abbreviated_language" VARCHAR(10) NOT NULL,
    "flag" VARCHAR(16) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" VARCHAR(100),

    CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_contents" (
    "id" SERIAL NOT NULL,
    "article_id" INTEGER NOT NULL,
    "language_id" INTEGER NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "article_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" VARCHAR(100),

    CONSTRAINT "article_contents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "languages_abbreviated_language_key" ON "languages"("abbreviated_language");

-- CreateIndex
CREATE UNIQUE INDEX "article_contents_article_id_language_id_key" ON "article_contents"("article_id", "language_id");

-- CreateIndex
CREATE UNIQUE INDEX "article_contents_language_id_slug_key" ON "article_contents"("language_id", "slug");

-- AddForeignKey
ALTER TABLE "article_contents" ADD CONSTRAINT "article_contents_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_contents" ADD CONSTRAINT "article_contents_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

