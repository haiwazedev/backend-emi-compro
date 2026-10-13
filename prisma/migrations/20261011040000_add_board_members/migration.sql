CREATE TABLE "board_member_types" (
    "id" SERIAL NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    CONSTRAINT "board_member_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "board_members" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "role" VARCHAR(100) NOT NULL,
    "board_member_type_id" INTEGER NOT NULL,
    "photo" VARCHAR(255),
    "sort_order" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" VARCHAR(100),
    CONSTRAINT "board_members_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "board_members_board_member_type_id_sort_order_idx"
ON "board_members"("board_member_type_id", "sort_order");

ALTER TABLE "board_members"
ADD CONSTRAINT "board_members_board_member_type_id_fkey"
FOREIGN KEY ("board_member_type_id")
REFERENCES "board_member_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
