-- CreateTable
CREATE TABLE "PropertyMessage" (
    "id" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "authorId" TEXT,
    "fromCompany" BOOLEAN NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyMessage_homeId_createdAt_idx" ON "PropertyMessage"("homeId", "createdAt");

-- AddForeignKey
ALTER TABLE "PropertyMessage" ADD CONSTRAINT "PropertyMessage_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyMessage" ADD CONSTRAINT "PropertyMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PropertyMessage" ENABLE ROW LEVEL SECURITY;
