INSERT INTO "languages" (
    "id",
    "language",
    "flag",
    "sort_order",
    "is_active",
    "created_by"
)
VALUES ('id', 'Bahasa Indonesia', '🇮🇩', 1, true, 'system')
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE "division_contents" (
    "division_id" INTEGER NOT NULL,
    "language_id" VARCHAR(10) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "abbr" VARCHAR(50) NOT NULL,
    "description" TEXT,
    CONSTRAINT "division_contents_pkey" PRIMARY KEY ("division_id", "language_id")
);

CREATE TABLE "service_contents" (
    "service_id" INTEGER NOT NULL,
    "language_id" VARCHAR(10) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    CONSTRAINT "service_contents_pkey" PRIMARY KEY ("service_id", "language_id")
);

INSERT INTO "division_contents" (
    "division_id",
    "language_id",
    "name",
    "abbr",
    "description"
)
SELECT "id", 'id', "name", "abbr", "description"
FROM "divisions";

INSERT INTO "service_contents" (
    "service_id",
    "language_id",
    "name",
    "description"
)
SELECT "id", 'id', "name", "description"
FROM "services";

ALTER TABLE "division_contents"
ADD CONSTRAINT "division_contents_division_id_fkey"
FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "division_contents"
ADD CONSTRAINT "division_contents_language_id_fkey"
FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "service_contents"
ADD CONSTRAINT "service_contents_service_id_fkey"
FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "service_contents"
ADD CONSTRAINT "service_contents_language_id_fkey"
FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "divisions"
DROP COLUMN "name",
DROP COLUMN "abbr",
DROP COLUMN "description";

ALTER TABLE "services"
DROP COLUMN "name",
DROP COLUMN "description";
