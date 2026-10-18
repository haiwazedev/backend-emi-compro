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

-- Existing FAQs become their Bahasa Indonesia content.
INSERT INTO "faq_contents" (
    "faq_id",
    "language_id",
    "question",
    "answer",
    "status",
    "created_at",
    "created_by",
    "updated_at",
    "updated_by"
)
SELECT
    "id",
    'id',
    "question",
    "answer",
    "status",
    "created_at",
    "created_by",
    "updated_at",
    "updated_by"
FROM "faqs";

CREATE UNIQUE INDEX "faq_contents_faq_id_language_id_key"
ON "faq_contents"("faq_id", "language_id");

CREATE INDEX "faq_contents_language_id_status_idx"
ON "faq_contents"("language_id", "status");

ALTER TABLE "faq_contents"
ADD CONSTRAINT "faq_contents_faq_id_fkey"
FOREIGN KEY ("faq_id") REFERENCES "faqs"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "faq_contents"
ADD CONSTRAINT "faq_contents_language_id_fkey"
FOREIGN KEY ("language_id") REFERENCES "languages"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX "faqs_status_sort_order_idx";

ALTER TABLE "faqs"
DROP COLUMN "question",
DROP COLUMN "answer",
DROP COLUMN "status";

CREATE INDEX "faqs_sort_order_idx" ON "faqs"("sort_order");
