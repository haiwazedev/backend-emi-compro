-- AlterTable
ALTER TABLE "site_settings" DROP COLUMN "size",
DROP COLUMN "type";

-- DropEnum
DROP TYPE "site_setting_type";
