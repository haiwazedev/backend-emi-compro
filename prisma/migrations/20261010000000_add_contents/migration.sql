-- CreateTable
CREATE TABLE "contents" (
    "id" SERIAL NOT NULL,
    "page" VARCHAR(100) NOT NULL,
    "block_key" VARCHAR(100) NOT NULL,
    "block_type" VARCHAR(100) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB,
    "media_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_by" VARCHAR(100),
    CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contents_page_block_key_block_type_sort_order_key"
ON "contents"("page", "block_key", "block_type", "sort_order");

-- AddForeignKey
ALTER TABLE "contents"
ADD CONSTRAINT "contents_media_id_fkey"
FOREIGN KEY ("media_id") REFERENCES "media"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
