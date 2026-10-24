-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "article_status" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "division_status" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "document_commitment_status" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "faq_status" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "media_type" AS ENUM ('PICTURE', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "user_token_purpose" AS ENUM ('INVITE', 'RESET');

-- CreateEnum
CREATE TYPE "activity_action" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'REORDER', 'RESEND_INVITE');

-- CreateEnum
CREATE TYPE "activity_resource" AS ENUM ('ARTICLE', 'ARTICLE_CATEGORY', 'BOARD_MEMBER', 'BOARD_MEMBER_TYPE', 'CLIENT', 'DIVISION', 'DOCUMENT_COMMITMENT', 'DOCUMENT_COMMITMENT_CATEGORY', 'FAQ', 'MEDIA', 'ROLE', 'ROLE_PERMISSION', 'SERVICE', 'SITE_CONTENT', 'SITE_SETTING', 'USER');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "password_changed_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "purpose" "user_token_purpose" NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" VARCHAR(100),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" VARCHAR(100),

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,
    "is_allowed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" VARCHAR(100),

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_signed_in" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" VARCHAR(100),

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,

    CONSTRAINT "article_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_commitment_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "document_commitment_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_commitments" (
    "id" SERIAL NOT NULL,
    "document_commitment_category_id" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "file_path" VARCHAR(255) NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "size" INTEGER NOT NULL,
    "status" "document_commitment_status" NOT NULL DEFAULT 'DRAFT',
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" VARCHAR(100),

    CONSTRAINT "document_commitments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "divisions" (
    "id" SERIAL NOT NULL,
    "icon_svg" TEXT,
    "status" "division_status" NOT NULL DEFAULT 'DRAFT',
    "sort_order" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" VARCHAR(100),

    CONSTRAINT "divisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "division_contents" (
    "division_id" INTEGER NOT NULL,
    "language_id" VARCHAR(10) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "abbr" VARCHAR(50) NOT NULL,
    "description" TEXT,

    CONSTRAINT "division_contents_pkey" PRIMARY KEY ("division_id","language_id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "logo_filename" VARCHAR(500) NOT NULL,
    "logo_filepath" VARCHAR(500) NOT NULL,
    "logo_extension" VARCHAR(10) NOT NULL,
    "logo_size" INTEGER NOT NULL,
    "logo_metadata" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" VARCHAR(100),

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" SERIAL NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" VARCHAR(100),

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq_contents" (
    "id" SERIAL NOT NULL,
    "faq_id" INTEGER NOT NULL,
    "language_id" VARCHAR(10) NOT NULL,
    "question" VARCHAR(200) NOT NULL,
    "answer" TEXT NOT NULL,
    "status" "faq_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" VARCHAR(100),

    CONSTRAINT "faq_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" SERIAL NOT NULL,
    "division_id" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" VARCHAR(100),

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_contents" (
    "service_id" INTEGER NOT NULL,
    "language_id" VARCHAR(10) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,

    CONSTRAINT "service_contents_pkey" PRIMARY KEY ("service_id","language_id")
);

-- CreateTable
CREATE TABLE "service_media" (
    "service_id" INTEGER NOT NULL,
    "media_id" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "service_media_pkey" PRIMARY KEY ("service_id","media_id")
);

-- CreateTable
CREATE TABLE "board_member_types" (
    "id" SERIAL NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "language_id" VARCHAR(10) NOT NULL,

    CONSTRAINT "board_member_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_members" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "company_name" VARCHAR(100),
    "photo" VARCHAR(255),
    "sort_order" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" VARCHAR(100),

    CONSTRAINT "board_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_member_contents" (
    "board_member_id" INTEGER NOT NULL,
    "language_id" VARCHAR(10) NOT NULL,
    "role" VARCHAR(100) NOT NULL,
    "board_member_type_id" INTEGER NOT NULL,
    "description" TEXT,

    CONSTRAINT "board_member_contents_pkey" PRIMARY KEY ("board_member_id","language_id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" SERIAL NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "alt" VARCHAR(255),
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
    "issue_date" DATE,
    "press_release_number" VARCHAR(255),
    "primary_photo_media_id" INTEGER,
    "cp_name" VARCHAR(100),
    "cp_role" VARCHAR(100),
    "cp_phone_number" VARCHAR(100),
    "cp_email" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" VARCHAR(100),

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "languages" (
    "id" VARCHAR(10) NOT NULL,
    "language" VARCHAR(255) NOT NULL,
    "flag" VARCHAR(16) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 1,
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
    "language_id" VARCHAR(10) NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "article_status" NOT NULL DEFAULT 'DRAFT',
    "read_time" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" VARCHAR(100),

    CONSTRAINT "article_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_contents" (
    "id" SERIAL NOT NULL,
    "page" VARCHAR(100) NOT NULL,
    "block_key" VARCHAR(100) NOT NULL,
    "block_type" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100) NOT NULL,

    CONSTRAINT "site_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_content_items" (
    "id" SERIAL NOT NULL,
    "site_content_id" INTEGER NOT NULL,
    "language_id" VARCHAR(10) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" VARCHAR(100),

    CONSTRAINT "site_content_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbox_subjects" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" VARCHAR(100),

    CONSTRAINT "inbox_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inboxes" (
    "id" SERIAL NOT NULL,
    "inbox_subject_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "company" VARCHAR(200),
    "phone" VARCHAR(30),
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inboxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "language_id" VARCHAR(10) NOT NULL,
    "value" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" VARCHAR(100),

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_social_medias" (
    "id" SERIAL NOT NULL,
    "platform_name" VARCHAR(50) NOT NULL,
    "platform_url_or_account_name" VARCHAR(255) NOT NULL,
    "icon_filename" VARCHAR(500),
    "icon_filepath" VARCHAR(500),
    "icon_extension" VARCHAR(10),
    "icon_size" INTEGER,
    "icon_metadata" JSONB,
    "status" "faq_status" NOT NULL DEFAULT 'DRAFT',
    "sort_order" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" VARCHAR(100),

    CONSTRAINT "site_social_medias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" SERIAL NOT NULL,
    "user_name" VARCHAR(100) NOT NULL,
    "action" "activity_action" NOT NULL,
    "resource" "activity_resource" NOT NULL,
    "action_result" VARCHAR(255),
    "item_count" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" VARCHAR(100),

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_configs" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "app_configs_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_tokens_token_hash_key" ON "user_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "user_tokens_user_id_idx" ON "user_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_key" ON "user_roles"("user_id");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "article_categories_slug_key" ON "article_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "document_commitments_filename_key" ON "document_commitments"("filename");

-- CreateIndex
CREATE INDEX "document_commitments_document_commitment_category_id_idx" ON "document_commitments"("document_commitment_category_id");

-- CreateIndex
CREATE INDEX "clients_sort_order_idx" ON "clients"("sort_order");

-- CreateIndex
CREATE INDEX "faqs_sort_order_idx" ON "faqs"("sort_order");

-- CreateIndex
CREATE INDEX "faq_contents_language_id_status_idx" ON "faq_contents"("language_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "faq_contents_faq_id_language_id_key" ON "faq_contents"("faq_id", "language_id");

-- CreateIndex
CREATE INDEX "services_division_id_sort_order_idx" ON "services"("division_id", "sort_order");

-- CreateIndex
CREATE INDEX "service_media_media_id_idx" ON "service_media"("media_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_media_service_id_sort_order_key" ON "service_media"("service_id", "sort_order");

-- CreateIndex
CREATE INDEX "board_member_types_language_id_idx" ON "board_member_types"("language_id");

-- CreateIndex
CREATE UNIQUE INDEX "board_member_types_id_language_id_key" ON "board_member_types"("id", "language_id");

-- CreateIndex
CREATE INDEX "board_members_sort_order_idx" ON "board_members"("sort_order");

-- CreateIndex
CREATE INDEX "board_member_contents_board_member_type_id_language_id_idx" ON "board_member_contents"("board_member_type_id", "language_id");

-- CreateIndex
CREATE INDEX "media_type_idx" ON "media"("type");

-- CreateIndex
CREATE INDEX "media_created_at_idx" ON "media"("created_at");

-- CreateIndex
CREATE INDEX "articles_article_category_id_idx" ON "articles"("article_category_id");

-- CreateIndex
CREATE INDEX "articles_primary_photo_media_id_idx" ON "articles"("primary_photo_media_id");

-- CreateIndex
CREATE UNIQUE INDEX "article_contents_slug_key" ON "article_contents"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "article_contents_article_id_language_id_key" ON "article_contents"("article_id", "language_id");

-- CreateIndex
CREATE UNIQUE INDEX "site_contents_page_block_key_block_type_key" ON "site_contents"("page", "block_key", "block_type");

-- CreateIndex
CREATE INDEX "site_content_items_language_id_idx" ON "site_content_items"("language_id");

-- CreateIndex
CREATE UNIQUE INDEX "site_content_items_site_content_id_language_id_sort_order_key" ON "site_content_items"("site_content_id", "language_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "inbox_subjects_name_key" ON "inbox_subjects"("name");

-- CreateIndex
CREATE INDEX "inboxes_inbox_subject_id_idx" ON "inboxes"("inbox_subject_id");

-- CreateIndex
CREATE INDEX "inboxes_is_read_idx" ON "inboxes"("is_read");

-- CreateIndex
CREATE INDEX "inboxes_created_at_idx" ON "inboxes"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "site_settings_key_language_id_key" ON "site_settings"("key", "language_id");

-- CreateIndex
CREATE INDEX "site_social_medias_status_sort_order_idx" ON "site_social_medias"("status", "sort_order");

-- CreateIndex
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at");

-- AddForeignKey
ALTER TABLE "user_tokens" ADD CONSTRAINT "user_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_commitments" ADD CONSTRAINT "document_commitments_document_commitment_category_id_fkey" FOREIGN KEY ("document_commitment_category_id") REFERENCES "document_commitment_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "division_contents" ADD CONSTRAINT "division_contents_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "division_contents" ADD CONSTRAINT "division_contents_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faq_contents" ADD CONSTRAINT "faq_contents_faq_id_fkey" FOREIGN KEY ("faq_id") REFERENCES "faqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faq_contents" ADD CONSTRAINT "faq_contents_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_contents" ADD CONSTRAINT "service_contents_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_contents" ADD CONSTRAINT "service_contents_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_media" ADD CONSTRAINT "service_media_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_media" ADD CONSTRAINT "service_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_member_types" ADD CONSTRAINT "board_member_types_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_member_contents" ADD CONSTRAINT "board_member_contents_board_member_id_fkey" FOREIGN KEY ("board_member_id") REFERENCES "board_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_member_contents" ADD CONSTRAINT "board_member_contents_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_member_contents" ADD CONSTRAINT "board_member_contents_board_member_type_id_language_id_fkey" FOREIGN KEY ("board_member_type_id", "language_id") REFERENCES "board_member_types"("id", "language_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_article_category_id_fkey" FOREIGN KEY ("article_category_id") REFERENCES "article_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_primary_photo_media_id_fkey" FOREIGN KEY ("primary_photo_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_contents" ADD CONSTRAINT "article_contents_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_contents" ADD CONSTRAINT "article_contents_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_content_items" ADD CONSTRAINT "site_content_items_site_content_id_fkey" FOREIGN KEY ("site_content_id") REFERENCES "site_contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_content_items" ADD CONSTRAINT "site_content_items_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inboxes" ADD CONSTRAINT "inboxes_inbox_subject_id_fkey" FOREIGN KEY ("inbox_subject_id") REFERENCES "inbox_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Seed data
INSERT INTO "languages" ("id", "language", "flag", "sort_order", "is_active", "created_by")
VALUES ('id', 'Bahasa Indonesia', '🇮🇩', 1, true, 'system');

INSERT INTO "app_configs" ("key", "value") VALUES ('max_users', '10');
