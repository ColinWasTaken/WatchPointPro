-- CreateTable
CREATE TABLE "ChecklistTemplateItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "readingUnit" TEXT,
    "position" INTEGER NOT NULL,

    CONSTRAINT "ChecklistTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChecklistTemplateItem_companyId_position_idx" ON "ChecklistTemplateItem"("companyId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistTemplateItem_companyId_key_key" ON "ChecklistTemplateItem"("companyId", "key");

-- AddForeignKey
ALTER TABLE "ChecklistTemplateItem" ADD CONSTRAINT "ChecklistTemplateItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChecklistTemplateItem" ENABLE ROW LEVEL SECURITY;
