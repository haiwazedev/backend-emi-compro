-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "article_status" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "media_type" AS ENUM ('PICTURE', 'DOCUMENT');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    CONSTRAINT "article_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" SERIAL NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "path" VARCHAR(255) NOT NULL,
    "extension" VARCHAR(20) NOT NULL,
    "type" "media_type" NOT NULL,
    "size" INTEGER NOT NULL,
    "metadata" JSONB,
    "created_by" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
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
    "primary_photo_media_id" INTEGER,
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
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "article_categories_slug_key" ON "article_categories"("slug");
CREATE UNIQUE INDEX "media_filename_key" ON "media"("filename");
CREATE UNIQUE INDEX "articles_slug_key" ON "articles"("slug");
CREATE INDEX "media_type_idx" ON "media"("type");
CREATE INDEX "media_created_at_idx" ON "media"("created_at");
CREATE INDEX "articles_article_category_id_idx" ON "articles"("article_category_id");
CREATE INDEX "articles_primary_photo_media_id_idx" ON "articles"("primary_photo_media_id");

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_article_category_id_fkey" FOREIGN KEY ("article_category_id") REFERENCES "article_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "articles" ADD CONSTRAINT "articles_primary_photo_media_id_fkey" FOREIGN KEY ("primary_photo_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
