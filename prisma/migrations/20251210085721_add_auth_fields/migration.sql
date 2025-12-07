/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwordHash` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "email" TEXT,
  ADD COLUMN "passwordHash" TEXT;

UPDATE "User"
SET
  "email" = 'legacy_user_' || "id" || '@example.com',
  "passwordHash" = '$2b$10$OYwJmNzFlc64GnML/.CACu3RNJJ0WOcfIbCyDQ4NPJV2vqFf6.4oW'
WHERE "email" IS NULL;

ALTER TABLE "User"
  ALTER COLUMN "email" SET NOT NULL,
  ALTER COLUMN "passwordHash" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

