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

-- CreateIndex
CREATE UNIQUE INDEX "site_contents_page_block_key_block_type_key" ON "site_contents"("page", "block_key", "block_type");

-- CreateIndex
CREATE INDEX "site_content_items_language_id_idx" ON "site_content_items"("language_id");

-- CreateIndex
CREATE UNIQUE INDEX "site_content_items_site_content_id_language_id_sort_order_key" ON "site_content_items"("site_content_id", "language_id", "sort_order");

-- AddForeignKey
ALTER TABLE "site_content_items" ADD CONSTRAINT "site_content_items_site_content_id_fkey" FOREIGN KEY ("site_content_id") REFERENCES "site_contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_content_items" ADD CONSTRAINT "site_content_items_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

