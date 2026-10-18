-- Add location coordinate keys for every configured language.
INSERT INTO "site_settings" ("key", "language_id", "created_by")
SELECT setting."key", language."id", 'system'
FROM "languages" AS language
CROSS JOIN (
    VALUES ('company_location_lat'), ('company_location_long')
) AS setting("key")
ON CONFLICT ("key", "language_id") DO NOTHING;
