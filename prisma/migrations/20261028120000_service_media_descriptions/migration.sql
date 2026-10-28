CREATE TABLE "service_media_contents" (
    "service_id" INTEGER NOT NULL,
    "media_id" INTEGER NOT NULL,
    "language_id" VARCHAR(10) NOT NULL,
    "description" TEXT,

    CONSTRAINT "service_media_contents_pkey"
        PRIMARY KEY ("service_id", "media_id", "language_id")
);

INSERT INTO "service_media_contents" (
    "service_id",
    "media_id",
    "language_id",
    "description"
)
SELECT service_media."service_id",
       service_media."media_id",
       service_contents."language_id",
       service_contents."description"
FROM "service_media"
JOIN "service_contents"
    ON service_contents."service_id" = service_media."service_id";

CREATE INDEX "service_media_contents_language_id_idx"
    ON "service_media_contents"("language_id");

ALTER TABLE "service_media_contents"
    ADD CONSTRAINT "service_media_contents_service_id_media_id_fkey"
    FOREIGN KEY ("service_id", "media_id")
    REFERENCES "service_media"("service_id", "media_id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "service_media_contents"
    ADD CONSTRAINT "service_media_contents_language_id_fkey"
    FOREIGN KEY ("language_id")
    REFERENCES "languages"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "service_contents"
    DROP COLUMN "description";
