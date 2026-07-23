-- CreateTable
CREATE TABLE "compliance_items" (
    "id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "completedById" UUID,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
