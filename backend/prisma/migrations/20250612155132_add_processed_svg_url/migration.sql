/*
  Warnings:

  - You are about to drop the column `numColors` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Project` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Project" DROP COLUMN "numColors",
DROP COLUMN "title",
ALTER COLUMN "status" DROP DEFAULT;
