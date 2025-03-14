-- AlterTable
ALTER TABLE "Credential" ADD COLUMN     "paymentStatus" TEXT
ADD COLUMN     "subscriptionId" TEXT;

-- CreateIndex
CREATE INDEX "Credential_subscriptionId_idx" ON "Credential"("subscriptionId");
