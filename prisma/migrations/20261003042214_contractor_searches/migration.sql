-- CreateTable
CREATE TABLE "ContractorSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "trade" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractorSearch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractorSearch_userId_createdAt_idx" ON "ContractorSearch"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "ContractorSearch" ADD CONSTRAINT "ContractorSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorSearch" ADD CONSTRAINT "ContractorSearch_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContractorSearch" ENABLE ROW LEVEL SECURITY;
