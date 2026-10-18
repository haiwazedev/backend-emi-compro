ALTER TABLE "divisions"
ADD COLUMN "description" TEXT;

ALTER TABLE "services"
ADD COLUMN "description" TEXT;

CREATE TABLE "service_media" (
    "service_id" INTEGER NOT NULL,
    "media_id" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL,
    CONSTRAINT "service_media_pkey" PRIMARY KEY ("service_id", "media_id")
);

CREATE UNIQUE INDEX "service_media_service_id_sort_order_key"
ON "service_media"("service_id", "sort_order");

CREATE INDEX "service_media_media_id_idx"
ON "service_media"("media_id");

ALTER TABLE "service_media"
ADD CONSTRAINT "service_media_service_id_fkey"
FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "service_media"
ADD CONSTRAINT "service_media_media_id_fkey"
FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
