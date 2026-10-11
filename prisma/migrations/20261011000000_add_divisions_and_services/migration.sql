-- CreateEnum
CREATE TYPE "division_status" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "divisions" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "abbr" VARCHAR(50) NOT NULL,
    "icon_svg" TEXT,
    "status" "division_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" VARCHAR(100),
    CONSTRAINT "divisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" SERIAL NOT NULL,
    "division_id" INTEGER NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMPTZ(6),
    "updated_by" VARCHAR(100),
    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "services_division_id_sort_order_idx"
ON "services"("division_id", "sort_order");

-- AddForeignKey
ALTER TABLE "services"
ADD CONSTRAINT "services_division_id_fkey"
FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
