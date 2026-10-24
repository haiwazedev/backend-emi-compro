-- CreateEnum
CREATE TYPE "activity_action" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'REORDER', 'RESEND_INVITE');

-- CreateEnum
CREATE TYPE "activity_resource" AS ENUM ('ARTICLE', 'ARTICLE_CATEGORY', 'BOARD_MEMBER', 'BOARD_MEMBER_TYPE', 'CLIENT', 'DIVISION', 'DOCUMENT_COMMITMENT', 'DOCUMENT_COMMITMENT_CATEGORY', 'FAQ', 'MEDIA', 'ROLE', 'ROLE_PERMISSION', 'SERVICE', 'SITE_CONTENT', 'SITE_SETTING', 'USER');

-- AlterTable
ALTER TABLE "activity_logs" ADD COLUMN "action" "activity_action",
ADD COLUMN "resource" "activity_resource",
ADD COLUMN "item_count" INTEGER,
ALTER COLUMN "action_result" DROP NOT NULL;

-- Convert the old Indonesian action types, e.g. 'menambahkan artikel' -> CREATE + ARTICLE.
UPDATE "activity_logs" AS log
SET "action" = verb."action"::"activity_action",
    "resource" = noun."resource"::"activity_resource"
FROM (VALUES
    ('menambahkan', 'CREATE'),
    ('memperbarui', 'UPDATE'),
    ('menghapus', 'DELETE')
) AS verb("word", "action")
CROSS JOIN (VALUES
    ('artikel', 'ARTICLE'),
    ('kategori artikel', 'ARTICLE_CATEGORY'),
    ('anggota direksi', 'BOARD_MEMBER'),
    ('tipe anggota direksi', 'BOARD_MEMBER_TYPE'),
    ('klien', 'CLIENT'),
    ('divisi', 'DIVISION'),
    ('dokumen', 'DOCUMENT_COMMITMENT'),
    ('kategori dokumen', 'DOCUMENT_COMMITMENT_CATEGORY'),
    ('FAQ', 'FAQ'),
    ('media', 'MEDIA'),
    ('peran', 'ROLE'),
    ('hak akses peran', 'ROLE_PERMISSION'),
    ('layanan', 'SERVICE'),
    ('konten halaman', 'SITE_CONTENT'),
    ('pengaturan situs', 'SITE_SETTING'),
    ('pengguna', 'USER')
) AS noun("word", "resource")
WHERE log."action_type" = verb."word" || ' ' || noun."word";

UPDATE "activity_logs"
SET "action" = 'RESEND_INVITE', "resource" = 'USER'
WHERE "action_type" = 'mengirim ulang undangan pengguna';

-- Reorders stored the resource as the result.
UPDATE "activity_logs" AS log
SET "action" = 'REORDER',
    "resource" = noun."resource"::"activity_resource",
    "action_result" = NULL
FROM (VALUES
    ('Klien', 'CLIENT'),
    ('Divisi', 'DIVISION'),
    ('FAQ', 'FAQ'),
    ('Layanan', 'SERVICE')
) AS noun("word", "resource")
WHERE log."action_type" = 'memperbarui urutan' AND log."action_result" = noun."word";

-- Results that were only Indonesian labels.
UPDATE "activity_logs" SET "action_result" = NULL WHERE "resource" = 'SITE_SETTING';

UPDATE "activity_logs"
SET "action_result" = substring("action_result" FROM '#\d+$')
WHERE "action" = 'DELETE' AND "action_result" ~ '^(Artikel|FAQ) #\d+$';

-- Bulk deletes stored the count as text, e.g. '3 artikel'.
UPDATE "activity_logs"
SET "item_count" = substring("action_result" FROM '^\d+')::INTEGER,
    "action_result" = NULL
WHERE "action" = 'DELETE' AND "action_result" ~ '^\d+ (artikel|dokumen|file)$';

DELETE FROM "activity_logs" WHERE "action" IS NULL OR "resource" IS NULL;

-- AlterTable
ALTER TABLE "activity_logs" DROP COLUMN "action_type",
ALTER COLUMN "action" SET NOT NULL,
ALTER COLUMN "resource" SET NOT NULL;
