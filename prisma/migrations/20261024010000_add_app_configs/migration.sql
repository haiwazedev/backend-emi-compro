-- CreateTable
CREATE TABLE "app_configs" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "app_configs_pkey" PRIMARY KEY ("key")
);

-- Seed the user limit.
INSERT INTO "app_configs" ("key", "value") VALUES ('max_users', '10');

-- Move the landing site URL out of the per-language site settings.
INSERT INTO "app_configs" ("key", "value")
SELECT 'landing_site_url', "value"
FROM "site_settings"
WHERE "key" = 'landing_site_url' AND "language_id" = 'id' AND "value" IS NOT NULL;

DELETE FROM "site_settings" WHERE "key" = 'landing_site_url';
