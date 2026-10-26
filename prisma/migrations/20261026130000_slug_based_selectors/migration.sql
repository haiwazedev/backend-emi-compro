ALTER TABLE "document_commitment_categories"
ADD COLUMN IF NOT EXISTS "slug" VARCHAR(100);

ALTER TABLE "division_contents"
ADD COLUMN IF NOT EXISTS "slug" VARCHAR(255);

UPDATE "document_commitment_categories"
SET "slug" = COALESCE(
  NULLIF(
    BTRIM(
      REGEXP_REPLACE(LOWER("name"), '[^a-z0-9]+', '-', 'g'),
      '-'
    ),
    ''
  ),
  'category-' || "id"::TEXT
);

DO $$
DECLARE
  updated_rows INTEGER;
BEGIN
  LOOP
    WITH duplicate_slugs AS (
      SELECT "slug"
      FROM "document_commitment_categories"
      GROUP BY "slug"
      HAVING COUNT(*) > 1
    )
    UPDATE "document_commitment_categories" AS category
    SET "slug" =
      LEFT(category."slug", 100 - LENGTH('-' || category."id"::TEXT))
      || '-' || category."id"::TEXT
    WHERE category."slug" IN (SELECT "slug" FROM duplicate_slugs);

    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    EXIT WHEN updated_rows = 0;
  END LOOP;
END $$;

UPDATE "division_contents"
SET "slug" = COALESCE(
  NULLIF(
    BTRIM(
      REGEXP_REPLACE(LOWER("name"), '[^a-z0-9]+', '-', 'g'),
      '-'
    ),
    ''
  ),
  'division-' || "division_id"::TEXT
);

DO $$
DECLARE
  updated_rows INTEGER;
BEGIN
  LOOP
    WITH duplicate_slugs AS (
      SELECT "language_id", "slug"
      FROM "division_contents"
      GROUP BY "language_id", "slug"
      HAVING COUNT(*) > 1
    )
    UPDATE "division_contents" AS content
    SET "slug" = content."slug" || '-' || content."division_id"::TEXT
    FROM duplicate_slugs
    WHERE content."language_id" = duplicate_slugs."language_id"
      AND content."slug" = duplicate_slugs."slug";

    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    EXIT WHEN updated_rows = 0;
  END LOOP;
END $$;

ALTER TABLE "document_commitment_categories"
ALTER COLUMN "slug" SET NOT NULL;

ALTER TABLE "division_contents"
ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "document_commitment_categories_slug_key"
ON "document_commitment_categories"("slug");

CREATE UNIQUE INDEX "division_contents_language_id_slug_key"
ON "division_contents"("language_id", "slug");
