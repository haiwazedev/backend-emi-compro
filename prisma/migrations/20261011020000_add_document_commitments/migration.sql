CREATE TYPE "document_commitment_status" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE "document_commitment_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    CONSTRAINT "document_commitment_categories_pkey" PRIMARY KEY ("id")
);

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

CREATE INDEX "document_commitments_document_commitment_category_id_idx"
ON "document_commitments"("document_commitment_category_id");

ALTER TABLE "document_commitments"
ADD CONSTRAINT "document_commitments_document_commitment_category_id_fkey"
FOREIGN KEY ("document_commitment_category_id")
REFERENCES "document_commitment_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
