-- DropIndex
DROP INDEX IF EXISTS "idx_products_status";

-- AlterTable
ALTER TABLE "products" DROP COLUMN IF EXISTS "status";

-- DropEnum
DROP TYPE IF EXISTS "product_status";
