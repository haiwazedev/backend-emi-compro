-- Slugs are unique across languages, so a slug identifies one article.
-- DropIndex
DROP INDEX "article_contents_language_id_slug_key";

-- CreateIndex
CREATE UNIQUE INDEX "article_contents_slug_key" ON "article_contents"("slug");
