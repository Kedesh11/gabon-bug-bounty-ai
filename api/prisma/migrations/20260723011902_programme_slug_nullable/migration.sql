-- AlterTable: nullable for now — every existing row gets one via a one-off backfill
-- script (see prisma/backfillProgrammeSlugs.ts) before a follow-up migration makes
-- this column required. Safe to add UNIQUE immediately: Postgres treats multiple
-- NULLs as distinct, so it never conflicts with itself while rows are unbackfilled.
ALTER TABLE "programmes" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "programmes_slug_key" ON "programmes"("slug");
