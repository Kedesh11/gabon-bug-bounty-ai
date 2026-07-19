-- CreateEnum
CREATE TYPE "ContentValueType" AS ENUM ('text', 'json');

-- CreateTable
CREATE TABLE "content_entries" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "type" "ContentValueType" NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,

    CONSTRAINT "content_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "navbar_items" (
    "id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isExternal" BOOLEAN NOT NULL DEFAULT false,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "navbar_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "footer_columns" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "footer_columns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "footer_links" (
    "id" UUID NOT NULL,
    "columnId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "footer_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "content_entries_key_key" ON "content_entries"("key");

-- AddForeignKey
ALTER TABLE "content_entries" ADD CONSTRAINT "content_entries_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "footer_links" ADD CONSTRAINT "footer_links_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "footer_columns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
