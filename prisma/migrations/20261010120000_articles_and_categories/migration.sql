-- CreateEnum
CREATE TYPE "article_status" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "article_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,

    CONSTRAINT "article_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" SERIAL NOT NULL,
    "article_category_id" INTEGER NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "issue_date" DATE,
    "press_release_number" VARCHAR(255),
    "primary_photo_url" VARCHAR(255) NOT NULL,
    "cp_name" VARCHAR(100),
    "cp_role" VARCHAR(100),
    "cp_phone_number" VARCHAR(100),
    "cp_email" VARCHAR(100),
    "status" "article_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" VARCHAR(100),

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "article_categories_slug_key" ON "article_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "articles_slug_key" ON "articles"("slug");

-- CreateIndex
CREATE INDEX "articles_article_category_id_idx" ON "articles"("article_category_id");

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_article_category_id_fkey" FOREIGN KEY ("article_category_id") REFERENCES "article_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
