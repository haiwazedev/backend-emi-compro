-- CreateTable
CREATE TABLE "site_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "company_name" VARCHAR(200) NOT NULL,
    "company_short_name" VARCHAR(50),
    "danantara_logo_filename" VARCHAR(500),
    "danantara_logo_filepath" VARCHAR(500),
    "danantara_logo_extension" VARCHAR(10),
    "danantara_logo_size" INTEGER,
    "danantara_logo_metadata" JSONB,
    "pln_logo_filename" VARCHAR(500),
    "pln_logo_filepath" VARCHAR(500),
    "pln_logo_extension" VARCHAR(10),
    "pln_logo_size" INTEGER,
    "pln_logo_metadata" JSONB,
    "company_address" VARCHAR(500) NOT NULL,
    "company_phone_number" VARCHAR(30),
    "company_whatsapp_number" VARCHAR(30),
    "main_email" VARCHAR(254),
    "marketing_email" VARCHAR(254),
    "operational_day" VARCHAR(100),
    "operational_start_time" VARCHAR(5),
    "operational_end_time" VARCHAR(5),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" VARCHAR(100),

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id"),
    -- Site settings is a single row.
    CONSTRAINT "site_settings_single_row" CHECK ("id" = 1)
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

-- CreateIndex
CREATE INDEX "site_social_medias_status_sort_order_idx" ON "site_social_medias"("status", "sort_order");
