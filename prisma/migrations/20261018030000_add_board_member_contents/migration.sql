ALTER TABLE "board_member_types"
ADD COLUMN "language_id" VARCHAR(10) NOT NULL DEFAULT 'id';

ALTER TABLE "board_member_types"
ALTER COLUMN "language_id" DROP DEFAULT;

CREATE UNIQUE INDEX "board_member_types_id_language_id_key"
ON "board_member_types"("id", "language_id");

CREATE INDEX "board_member_types_language_id_idx"
ON "board_member_types"("language_id");

CREATE TABLE "board_member_contents" (
    "board_member_id" INTEGER NOT NULL,
    "language_id" VARCHAR(10) NOT NULL,
    "role" VARCHAR(100) NOT NULL,
    "board_member_type_id" INTEGER NOT NULL,
    "description" TEXT,
    CONSTRAINT "board_member_contents_pkey" PRIMARY KEY ("board_member_id", "language_id")
);

INSERT INTO "board_member_contents" (
    "board_member_id",
    "language_id",
    "role",
    "board_member_type_id"
)
SELECT
    "id",
    'id',
    "role",
    "board_member_type_id"
FROM "board_members";

UPDATE "board_members" AS member
SET "sort_order" = ordered_members."sort_order"
FROM (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            ORDER BY "board_member_type_id" ASC, "sort_order" ASC, "id" ASC
        )::INTEGER AS "sort_order"
    FROM "board_members"
) AS ordered_members
WHERE member."id" = ordered_members."id";

CREATE INDEX "board_member_contents_board_member_type_id_language_id_idx"
ON "board_member_contents"("board_member_type_id", "language_id");

ALTER TABLE "board_member_types"
ADD CONSTRAINT "board_member_types_language_id_fkey"
FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "board_member_contents"
ADD CONSTRAINT "board_member_contents_board_member_id_fkey"
FOREIGN KEY ("board_member_id") REFERENCES "board_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "board_member_contents"
ADD CONSTRAINT "board_member_contents_language_id_fkey"
FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "board_member_contents"
ADD CONSTRAINT "board_member_contents_board_member_type_id_language_id_fkey"
FOREIGN KEY ("board_member_type_id", "language_id")
REFERENCES "board_member_types"("id", "language_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "board_members"
DROP CONSTRAINT "board_members_board_member_type_id_fkey";

DROP INDEX "board_members_board_member_type_id_sort_order_idx";

ALTER TABLE "board_members"
DROP COLUMN "role",
DROP COLUMN "board_member_type_id";

CREATE INDEX "board_members_sort_order_idx"
ON "board_members"("sort_order");
