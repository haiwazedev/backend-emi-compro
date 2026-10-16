-- CreateTable
CREATE TABLE "inbox_subjects" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "inbox_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inboxes" (
    "id" SERIAL NOT NULL,
    "inbox_subject_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "company" VARCHAR(200),
    "phone" VARCHAR(30),
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inboxes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inbox_subjects_name_key" ON "inbox_subjects"("name");

-- CreateIndex
CREATE INDEX "inboxes_inbox_subject_id_idx" ON "inboxes"("inbox_subject_id");

-- CreateIndex
CREATE INDEX "inboxes_is_read_idx" ON "inboxes"("is_read");

-- CreateIndex
CREATE INDEX "inboxes_created_at_idx" ON "inboxes"("created_at");

-- AddForeignKey
ALTER TABLE "inboxes" ADD CONSTRAINT "inboxes_inbox_subject_id_fkey" FOREIGN KEY ("inbox_subject_id") REFERENCES "inbox_subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
