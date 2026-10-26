CREATE TABLE "document_commitment_category_contents" (
    "document_commitment_category_id" INTEGER NOT NULL,
    "language_id" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,

    CONSTRAINT "document_commitment_category_contents_pkey"
        PRIMARY KEY ("document_commitment_category_id", "language_id")
);

CREATE TABLE "document_commitment_contents" (
    "document_commitment_id" INTEGER NOT NULL,
    "language_id" VARCHAR(10) NOT NULL,
    "title" VARCHAR(200) NOT NULL,

    CONSTRAINT "document_commitment_contents_pkey"
        PRIMARY KEY ("document_commitment_id", "language_id")
);

INSERT INTO "document_commitment_category_contents" (
    "document_commitment_category_id",
    "language_id",
    "name",
    "slug"
)
SELECT "id", 'id', "name", "slug"
FROM "document_commitment_categories";

INSERT INTO "document_commitment_contents" (
    "document_commitment_id",
    "language_id",
    "title"
)
SELECT "id", 'id', "title"
FROM "document_commitments";

ALTER TABLE "document_commitment_categories"
    DROP COLUMN "name",
    DROP COLUMN "slug";

ALTER TABLE "document_commitments"
    DROP COLUMN "title";

CREATE UNIQUE INDEX "document_commitment_category_contents_language_id_slug_key"
    ON "document_commitment_category_contents"("language_id", "slug");

ALTER TABLE "document_commitment_category_contents"
    ADD CONSTRAINT "document_commitment_category_contents_document_commitment_category_id_fkey"
    FOREIGN KEY ("document_commitment_category_id")
    REFERENCES "document_commitment_categories"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "document_commitment_category_contents"
    ADD CONSTRAINT "document_commitment_category_contents_language_id_fkey"
    FOREIGN KEY ("language_id")
    REFERENCES "languages"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "document_commitment_contents"
    ADD CONSTRAINT "document_commitment_contents_document_commitment_id_fkey"
    FOREIGN KEY ("document_commitment_id")
    REFERENCES "document_commitments"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "document_commitment_contents"
    ADD CONSTRAINT "document_commitment_contents_language_id_fkey"
    FOREIGN KEY ("language_id")
    REFERENCES "languages"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
