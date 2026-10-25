-- CreateEnum
CREATE TYPE "inspection_status" AS ENUM ('pending', 'pass', 'fail');

-- CreateEnum
CREATE TYPE "ai_inspection_status" AS ENUM ('processing', 'awaiting_verification', 'completed', 'error');

-- CreateEnum
CREATE TYPE "defect_type" AS ENUM ('scratch', 'dent', 'paint_issue', 'missing_component', 'no_defect');

-- CreateEnum
CREATE TYPE "prediction_status" AS ENUM ('pending', 'approved', 'overridden');

-- CreateTable
CREATE TABLE "inspections" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "inspection_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "inspection_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_inspections" (
    "id" SERIAL NOT NULL,
    "inspection_id" INTEGER NOT NULL,
    "image_url" VARCHAR(512) NOT NULL,
    "status" "ai_inspection_status" NOT NULL DEFAULT 'processing',
    "raw_response" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER,

    CONSTRAINT "ai_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_inspection_predictions" (
    "id" SERIAL NOT NULL,
    "ai_inspection_id" INTEGER NOT NULL,
    "ai_defect_type" "defect_type" NOT NULL,
    "confidence" DECIMAL(5,4) NOT NULL,
    "status" "prediction_status" NOT NULL DEFAULT 'pending',
    "final_defect_type" "defect_type",
    "comment" TEXT,
    "verified_by" INTEGER,
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER,

    CONSTRAINT "ai_inspection_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_results" (
    "id" SERIAL NOT NULL,
    "inspection_id" INTEGER NOT NULL,
    "ai_inspection_prediction_id" INTEGER NOT NULL,
    "defect_type" "defect_type" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER,

    CONSTRAINT "inspection_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_inspections_user_id" ON "inspections"("user_id");

-- CreateIndex
CREATE INDEX "idx_inspections_product_id" ON "inspections"("product_id");

-- CreateIndex
CREATE INDEX "idx_inspections_status" ON "inspections"("status");

-- CreateIndex
CREATE INDEX "idx_ai_inspections_inspection_id" ON "ai_inspections"("inspection_id");

-- CreateIndex
CREATE INDEX "idx_ai_inspections_status" ON "ai_inspections"("status");

-- CreateIndex
CREATE INDEX "idx_ai_inspection_predictions_ai_inspection_id" ON "ai_inspection_predictions"("ai_inspection_id");

-- CreateIndex
CREATE INDEX "idx_ai_inspection_predictions_status" ON "ai_inspection_predictions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_results_ai_inspection_prediction_id_key" ON "inspection_results"("ai_inspection_prediction_id");

-- CreateIndex
CREATE INDEX "idx_inspection_results_inspection_id" ON "inspection_results"("inspection_id");

-- CreateIndex
CREATE INDEX "idx_inspection_results_defect_type" ON "inspection_results"("defect_type");

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_inspections" ADD CONSTRAINT "ai_inspections_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_inspections" ADD CONSTRAINT "ai_inspections_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_inspections" ADD CONSTRAINT "ai_inspections_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_inspection_predictions" ADD CONSTRAINT "ai_inspection_predictions_ai_inspection_id_fkey" FOREIGN KEY ("ai_inspection_id") REFERENCES "ai_inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_inspection_predictions" ADD CONSTRAINT "ai_inspection_predictions_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_inspection_predictions" ADD CONSTRAINT "ai_inspection_predictions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_inspection_predictions" ADD CONSTRAINT "ai_inspection_predictions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_results" ADD CONSTRAINT "inspection_results_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_results" ADD CONSTRAINT "inspection_results_ai_inspection_prediction_id_fkey" FOREIGN KEY ("ai_inspection_prediction_id") REFERENCES "ai_inspection_predictions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_results" ADD CONSTRAINT "inspection_results_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_results" ADD CONSTRAINT "inspection_results_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

