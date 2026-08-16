/*
  Warnings:

  - You are about to drop the column `confirmationTokenString` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Order` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[confirmationToken]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Order_confirmationTokenString_key";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "confirmationTokenString",
DROP COLUMN "updatedAt",
ADD COLUMN     "confirmationToken" TEXT,
ADD COLUMN     "tokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Order_confirmationToken_key" ON "Order"("confirmationToken");
