-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."user_status" AS ENUM ('active', 'inactive', 'invited');

-- CreateEnum
CREATE TYPE "public"."user_role_name" AS ENUM ('quality_engineer', 'supervisor');

-- CreateEnum
CREATE TYPE "public"."user_role_status" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "public"."user_supervisor_status" AS ENUM ('active', 'inactive');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "status" "public"."user_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_roles" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" "public"."user_role_name" NOT NULL,
    "status" "public"."user_role_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_supervisors" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "supervisor_id" INTEGER NOT NULL,
    "status" "public"."user_supervisor_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER,

    CONSTRAINT "user_supervisors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "idx_users_status" ON "public"."users"("status");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "idx_user_roles_user_id" ON "public"."user_roles"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_roles_status" ON "public"."user_roles"("status");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_key" ON "public"."user_roles"("user_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "user_supervisors_user_id_key" ON "public"."user_supervisors"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_supervisors_supervisor_id" ON "public"."user_supervisors"("supervisor_id");

-- CreateIndex
CREATE INDEX "idx_user_supervisors_status" ON "public"."user_supervisors"("status");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_supervisors" ADD CONSTRAINT "user_supervisors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_supervisors" ADD CONSTRAINT "user_supervisors_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_supervisors" ADD CONSTRAINT "user_supervisors_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_supervisors" ADD CONSTRAINT "user_supervisors_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "user_supervisors" ADD CONSTRAINT "user_supervisors_distinct_users" CHECK (user_id <> supervisor_id);
