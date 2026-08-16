/*
  Warnings:

  - A unique constraint covering the columns `[confirmationTokenString]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "confirmationTokenString" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "Order_confirmationTokenString_key" ON "Order"("confirmationTokenString");
